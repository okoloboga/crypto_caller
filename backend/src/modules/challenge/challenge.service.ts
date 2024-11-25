import { Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { Address, Cell } from 'ton';

@Injectable()
export class ChallengeService {
  private readonly logger = new Logger(ChallengeService.name); // Логгирование
  private challenges = new Map<string, { challenge: string; validUntil: number }>();

  generateChallenge(walletAddress: string): string {
    const challenge = randomBytes(32).toString('hex'); // Генерация случайного challenge
    const validUntil = Date.now() + 5 * 60 * 1000; // Валидность 5 минут
    this.challenges.set(walletAddress, { challenge, validUntil });

    this.logger.log(`Generated challenge for walletAddress ${walletAddress}: ${challenge}`);
    return challenge;
  }

  verifyTonProof(walletAddress: string, tonProofBase64: string): boolean {
    try {
      const challengeData = this.challenges.get(walletAddress);

      if (!challengeData || Date.now() > challengeData.validUntil) {
        this.logger.warn(`Challenge expired or not found for walletAddress: ${walletAddress}`);
        throw new Error('Challenge expired or not found.');
      }

      // Распарсить TON Proof из base64
      const proofCell = Cell.fromBoc(Buffer.from(tonProofBase64, 'base64'))[0];

      // Извлечь адрес из TON Proof
      const addressSlice = proofCell.refs[0]?.beginParse();
      if (!addressSlice) {
        this.logger.warn('Не удалось извлечь адрес из TON Proof');
        return false;
      }

      const rawAddress = addressSlice.toString(); // Извлечение адреса как строки
      const parsedAddress = Address.parseFriendly(rawAddress).address;

      if (!parsedAddress || parsedAddress.toString() !== walletAddress) {
        this.logger.warn('Адрес кошелька не совпадает с предоставленным TON Proof');
        return false;
      }

      // Извлечь challenge из TON Proof
      const payloadSlice = proofCell.refs[1]?.beginParse();
      const payload = payloadSlice ? payloadSlice.loadRef().toString() : null;

      if (payload !== challengeData.challenge) {
        this.logger.warn('Challenge в TON Proof не совпадает с оригинальным');
        return false;
      }

      this.logger.log('TON Proof успешно проверен');
      this.challenges.delete(walletAddress); // Удалить использованный challenge
      return true;
    } catch (error) {
      this.logger.error('Ошибка проверки TON Proof:', error);
      return false;
    }
  }
}
