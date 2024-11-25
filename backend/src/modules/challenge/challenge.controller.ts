import { Controller, Get, Post, Query, Body, BadRequestException } from '@nestjs/common';
import { ChallengeService } from './challenge.service';

@Controller('challenge')
export class ChallengeController {
  constructor(private readonly challengeService: ChallengeService) {}

  // Эндпоинт для генерации challenge
  @Get('generate')
  generateChallenge(@Query('walletAddress') walletAddress: string): { challenge: string } {
    if (!walletAddress) {
      throw new BadRequestException('Wallet address is required');
    }

    const challenge = this.challengeService.generateChallenge(walletAddress);
    return { challenge };
  }

  // Эндпоинт для проверки challenge
  @Post('verify')
  verifyChallenge(
    @Body() verifyDto: { walletAddress: string; signedChallenge: string; publicKey: string },
  ): { valid: boolean } {
    const { walletAddress, signedChallenge, publicKey } = verifyDto;

    if (!walletAddress || !signedChallenge || !publicKey) {
      throw new BadRequestException('Missing required parameters');
    }

    try {
      const isValid = this.challengeService.verifyChallenge(walletAddress, signedChallenge, publicKey);
      return { valid: isValid };
    } catch (error) {
      console.error('Ошибка проверки подписи challenge:', error.message);
      throw new BadRequestException('Ошибка проверки подписи.');
    }
  }
}
