import { Controller, Get, Post, Query, Body, 
         Logger, BadRequestException } from '@nestjs/common';
import { ChallengeService } from './challenge.service';

@Controller('challenge')
export class ChallengeController {
  private readonly logger = new Logger(ChallengeController.name);
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
  async verifyTonProof(
    @Body() verifyDto: { account: any; tonProof: any }, // `tonProof` должен быть объектом
  ): Promise<{ valid: boolean }> {
    const { account, tonProof } = verifyDto;

    if (!account || !tonProof) {
      this.logger.warn('Missing required parameters in verify request');
      throw new BadRequestException('Missing required parameters');
    }

    try {
      this.logger.log(`Начало проверки TON Proof для walletAddress: ${account}`);
      const isValid = await this.challengeService.verifyTonProof(account, tonProof);

      if (isValid) {
        this.logger.log(`TON Proof verification successful for walletAddress: ${account}`);
      } else {
        this.logger.warn(`TON Proof verification failed for walletAddress: ${account}`);
      }

      return { valid: isValid };
    } catch (error) {
      this.logger.error(`Ошибка проверки TON Proof для walletAddress: ${account}`, error.message);
      throw new BadRequestException('Ошибка проверки TON Proof.');
    }
  }
}
