/**
 * Controller for handling challenge-related operations in the RUBLE Farming App backend.
 * This controller provides endpoints for generating a challenge for TON proof authentication
 * and verifying the TON proof submitted by the client. It is part of the ChallengeModule.
 */

import { Controller, Get, Post, Query, Body, Logger, BadRequestException } from '@nestjs/common'; // Import NestJS core decorators and exceptions
import { ChallengeService } from './challenge.service'; // Import the ChallengeService for business logic

/**
 * ChallengeController class handling challenge generation and verification endpoints.
 * Routes are prefixed with '/api/challenge' due to the global API prefix and controller path.
 */
@Controller('challenge')
export class ChallengeController {
  // Logger instance for logging controller events
  private readonly logger = new Logger(ChallengeController.name);

  /**
   * Constructor to inject dependencies.
   * @param challengeService - The service handling challenge generation and verification logic.
   */
  constructor(private readonly challengeService: ChallengeService) {}

  /**
   * Generate a challenge for TON proof authentication.
   * Endpoint: GET /api/challenge/generate
   * @returns An object containing the generated challenge string and clientId.
   */
  @Get('generate')
  generateChallenge(): { challenge: string; clientId: string } {
    const clientId = Date.now().toString();
    // Generate the challenge using the service
    const challenge = this.challengeService.generateChallenge(clientId);
    return { challenge, clientId };
  }

  /**
   * Verify a TON proof submitted by the client.
   * Endpoint: POST /api/challenge/verify
   * @param verifyDto - The request body containing walletAddress, tonProof, and account.
   * @returns An object indicating whether the TON proof is valid.
   * @throws BadRequestException if required parameters are missing or verification fails.
   */
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