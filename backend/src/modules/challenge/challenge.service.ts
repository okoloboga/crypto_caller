import { Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { Address, Cell, contractAddress, loadStateInit, TonClient4 } from 'ton';

@Injectable()
export class ChallengeService {
  private readonly logger = new Logger(ChallengeService.name); // Логгирование
  private challenges = new Map<string, { challenge: string; validUntil: number }>();
  private client: TonClient4;

  constructor() {
    this.client = new TonClient4({
      endpoint: 'https://mainnet-v4.tonhubapi.com', // API-эндпоинт TON
    });
  }

  generateChallenge(walletAddress: string): string {
    const challenge = randomBytes(32).toString('hex'); // Генерация случайного challenge
    const validUntil = Date.now() + 5 * 60 * 1000; // Валидность 5 минут
    
    const challengeData = { challenge, validUntil };
    
    // Проверка содержимого перед добавлением
    this.logger.log('Challenge data:', challengeData);
    
    this.challenges.set(walletAddress, challengeData);
  
    this.logger.log(`Generated challenge for walletAddress ${walletAddress}: ${challenge}`);
    return challenge;
  }


  async verifyTonProof(account: any, tonProof: any): Promise<boolean> {

    this.logger.log(`Account Data: ${JSON.stringify(account, null, 2)}: address: ${account.address}`)

    const payload = {
        address: account.address,
        public_key: account.publicKey,
        proof: {
            ...tonProof,
            state_init: account.walletStateInit
        }
    }

    this.logger.log(`Verifying TON Proof. Payload: ${JSON.stringify(payload, null, 2)}`);


    try {
        const challengeData = this.challenges.get(account.address);

        this.logger.log(`ChallengeData: ${JSON.stringify(challengeData, null, 2)}`)

        if (!challengeData) {
          this.logger.warn(`Challenge data not found for walletAddress: ${account.address}`);
          throw new Error('Challenge not found.');
        }

        if (!challengeData.challenge || !challengeData.validUntil) {
          this.logger.warn(`Invalid challenge data for walletAddress: ${account.address}`);
          throw new Error('Challenge data is invalid or incomplete.');
        }

        // Дальше, проверка истечения времени
        if (Date.now() > challengeData.validUntil) {
          this.logger.warn(`Challenge expired for walletAddress: ${account.address}`);
          throw new Error('Challenge expired.');
        }

        const { proof } = tonProof;

        if (!proof) {
            this.logger.error('Proof is missing in the received TON Proof');
            throw new Error('Missing proof in the received TON Proof');
        }

        const { timestamp, domain, signature, payload } = proof;

        if (!timestamp || !domain || !signature || !payload) {
            this.logger.error('Недостаточно данных для проверки proof');
            return false;
        }

        if (typeof timestamp !== 'number') {
            this.logger.error('Неверный формат timestamp');
            return false;
        }

        this.logger.log(`Proof details: timestamp=${timestamp}, domain=${domain.value}, signature=${signature}, payload=${payload}`);

        // 1. Проверка домена
        if (domain.value !== 'caller.ruble.website') {
            this.logger.warn('Домен не совпадает.');
            return false;
        }

        // 2. Проверка таймстампа
        const now = Math.floor(Date.now() / 1000);
        if (now - timestamp > 900) {
            this.logger.warn('Таймстамп устарел.');
            return false;
        }

        // 3. Получение и парсинг state_init из аккаунта
        const stateInit = loadStateInit(Cell.fromBase64(account.walletStateInit).beginParse());

        // 4. Проверка публичного ключа
        const publicKeyFromContract = Buffer.from(payload.public_key, 'hex');
        if (!publicKeyFromContract) {
            this.logger.warn('Публичный ключ не найден.');
            return false;
        }

        // 5. Получение адреса из state_init и сравнение его с переданным
        const wantedAddress = Address.parse(payload.address);
        const address = contractAddress(wantedAddress.workChain, stateInit);
        if (!address.equals(wantedAddress)) {
            this.logger.warn('Адрес в state_init не совпадает с переданным.');
            return false;
        }

        // 6. Проверка подписи
        const message = this.assembleMessage(account.address, domain.value, timestamp, payload);
        const isSignatureValid = this.verifySignature(publicKeyFromContract, signature, message);
        if (!isSignatureValid) {
            this.logger.warn('Подпись не прошла проверку.');
            return false;
        }

        // 7. Проверка challenge
        if (payload !== challengeData.challenge) {
            this.logger.warn('Challenge в TON Proof не совпадает с оригинальным.');
            return false;
        }

        this.logger.log('TON Proof успешно проверен.');
        this.challenges.delete(account.address);
        return true;
    } catch (error) {
        this.logger.error('Ошибка проверки TON Proof:', error);
        return false;
    }
}

  private assembleMessage(walletAddress: string, domain: string, timestamp: number, payload: string): Buffer {
    const addressBuffer = Address.parse(walletAddress).hash
    const domainBuffer = Buffer.from(domain, 'utf8');
    const timestampBuffer = Buffer.alloc(8);
    timestampBuffer.writeBigInt64BE(BigInt(timestamp), 0);
    const payloadBuffer = Buffer.from(payload, 'utf8');

    return Buffer.concat([
      Buffer.from('ton-proof-item-v2/', 'utf8'),
      addressBuffer,
      domainBuffer,
      timestampBuffer,
      payloadBuffer,
    ]);
  }

  private verifySignature(publicKey: Buffer, signature: string, message: Buffer): boolean {
    const signatureBuffer = Buffer.from(signature, 'base64');
    return require('tweetnacl').sign.detached.verify(message, signatureBuffer, publicKey);
  }
}
