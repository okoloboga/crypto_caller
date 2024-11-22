import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';

@Injectable()
export class ChallengeService {
  private challenges = new Map<string, { challenge: string; validUntil: number }>();

  generateChallenge(walletAddress: string): string {
    const challenge = randomBytes(32).toString('hex');
    const validUntil = Date.now() + 5 * 60 * 1000; // 5 минут
    this.challenges.set(walletAddress, { challenge, validUntil });
    return challenge;
  }

  verifyChallenge(walletAddress: string, signedChallenge: string, publicKey: string): boolean {
    const challengeData = this.challenges.get(walletAddress);

    if (!challengeData || Date.now() > challengeData.validUntil) {
      throw new Error('Challenge expired or not found.');
    }

    // Проверяем подпись
    const isValid = verifySignature({
      signature: signedChallenge,
      publicKey,
      message: challengeData.challenge,
    });

    if (isValid) {
      this.challenges.delete(walletAddress); // Удаляем использованный challenge
    }

    return isValid;
  }
}

// Пример функции валидации подписи (замени на реальную библиотеку TON SDK)
function verifySignature({ signature, publicKey, message }: { signature: string; publicKey: string; message: string }): boolean {
  // Логика проверки подписи
  return true; // Пример: вернуть true для упрощения
}
