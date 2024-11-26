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
    this.challenges.set(walletAddress, { challenge, validUntil });

    this.logger.log(`Generated challenge for walletAddress ${walletAddress}: ${challenge}`);
    return challenge;
  }

  async verifyTonProof(walletAddress: string, tonProof: any): Promise<boolean> {

    this.logger.log(`Verifying TON Proof for walletAddress: ${walletAddress}, TON Proof: ${tonProof}`);

    try {
      const challengeData = this.challenges.get(walletAddress);

      if (!challengeData || Date.now() > challengeData.validUntil) {
        this.logger.warn(`Challenge expired or not found for walletAddress: ${walletAddress}`);
        throw new Error('Challenge expired or not found.');
      }

      const { proof } = tonProof;

      if (!proof) {
        this.logger.error('Proof is missing in the received TON Proof');
        throw new Error('Missing proof in the received TON Proof');
      }

      this.logger.log('TON Proof:', proof);

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

      // 5. Получение публичного ключа из смарт-контракта
      const masterAt = await this.client.getLastBlock();
      const result = await this.client.runMethod(
        masterAt.last.seqno,
        Address.parse(walletAddress),
        'get_public_key',
        [],
      );

      this.logger.log('Полученный результат публичного ключа:', result);

      const publicKey = Buffer.from(result.reader.readBigNumber().toString(16).padStart(64, '0'), 'hex');

      // 6. Сборка сообщения
      const message = this.assembleMessage(walletAddress, domain.value, timestamp, payload);

      // 7. Проверка подписи
      const isSignatureValid = this.verifySignature(publicKey, signature, message);
      if (!isSignatureValid) {
        this.logger.warn('Подпись не прошла проверку.');
        return false;
      }

      // 8. Проверка challenge
      if (payload !== challengeData.challenge) {
        this.logger.warn('Challenge в TON Proof не совпадает с оригинальным.');
        return false;
      }

      this.logger.log('TON Proof успешно проверен.');
      this.challenges.delete(walletAddress);
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
