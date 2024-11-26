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
    try {
      const challengeData = this.challenges.get(walletAddress);

      if (!challengeData || Date.now() > challengeData.validUntil) {
        this.logger.warn(`Challenge expired or not found for walletAddress: ${walletAddress}`);
        throw new Error('Challenge expired or not found.');
      }

      const { proof } = tonProof;
      const { timestamp, domain, payload, signature, state_init } = proof;

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

      // 3. Загрузка state_init
      const stateInit = loadStateInit(Cell.fromBase64(state_init).beginParse());
      const address = contractAddress(0, stateInit);

      // 4. Проверка совпадения адреса
      if (address.toString() !== walletAddress) {
        this.logger.warn('Адрес не совпадает.');
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
      this.challenges.delete(walletAddress); // Удаляем использованный challenge
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
