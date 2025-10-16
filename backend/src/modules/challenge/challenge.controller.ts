import { Controller, Get, Post, Query, Body, Logger, BadRequestException } from '@nestjs/common';
import { ChallengeService } from './challenge.service';
@Controller('challenge')
export class ChallengeController {
  private readonly logger = new Logger(ChallengeController.name);
  constructor(private readonly challengeService: ChallengeService) {}

  @Get('generate')
  generateChallenge(): { challenge: string; clientId: string } {
    const clientId = Date.now().toString();
    // Generate the challenge using the service
    const challenge = this.challengeService.generateChallenge(clientId);
    return { challenge, clientId };
  }

  @Post('verify')
  async verifyTonProof(
    @Body() verifyDto: { walletAddress: string; tonProof: any; account: any }, // tonProof and account are expected to be objects
  ): Promise<{ valid: boolean }> {
    const { walletAddress, tonProof, account } = verifyDto;

    // Validate the presence of required parameters
    if (!walletAddress || !tonProof) {
      this.logger.warn('Missing required parameters in verify request');
      throw new BadRequestException('Missing required parameters');
    }

    try {
      this.logger.log(`Starting TON Proof verification for walletAddress: ${walletAddress}`);
      // Verify the TON proof using the service
      const isValid = await this.challengeService.verifyTonProof(account, tonProof);

      // Log the result of the verification
      if (isValid) {
        this.logger.log(`TON Proof verification successful for walletAddress: ${walletAddress}`);
      } else {
        this.logger.warn(`TON Proof verification failed for walletAddress: ${walletAddress}`);
      }

      return { valid: isValid };
    } catch (error) {
      // Log and throw an error if verification fails
      this.logger.error(`Error verifying TON Proof for walletAddress: ${walletAddress}`, error.message);
      throw new BadRequestException('Error verifying TON Proof.');
    }
  }
}