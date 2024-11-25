import { Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { sign } from 'tweetnacl'; // tweetnacl для Ed25519
import { Buffer } from 'buffer'; // Убедитесь, что Buffer доступен

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

  verifyChallenge(walletAddress: string, signedChallenge: string, publicKey: string): boolean {
    const challengeData = this.challenges.get(walletAddress);

    if (!challengeData || Date.now() > challengeData.validUntil) {
      this.logger.warn(`Challenge expired or not found for walletAddress: ${walletAddress}`);
      throw new Error('Challenge expired or not found.');
    }

    // Вызов функции валидации подписи
    const isValid = verifySignature({
      signature: signedChallenge,
      publicKey,
      message: challengeData.challenge,
    });

    if (isValid) {
      this.logger.log(`Challenge verified successfully for walletAddress: ${walletAddress}`);
      this.challenges.delete(walletAddress); // Удаляем использованный challenge
    } else {
      this.logger.warn(`Invalid challenge signature for walletAddress: ${walletAddress}`);
    }

    return isValid;
  }
}

// Реализация валидации подписи
function verifySignature({ signature, publicKey, message }: { signature: string; publicKey: string; message: string }): boolean {
  try {
    const signatureBuffer = Buffer.from(signature, 'base64'); // Подпись в формате base64
    const publicKeyBuffer = Buffer.from(publicKey, 'hex'); // Публичный ключ в формате hex
    const messageBuffer = Buffer.from(message, 'utf-8'); // Сообщение в UTF-8

    // Проверка подписи через tweetnacl
    const isValid = sign.detached.verify(messageBuffer, signatureBuffer, publicKeyBuffer);

    return isValid;
  } catch (error) {
    console.error('Ошибка при проверке подписи:', error);
    return false;
  }
}
