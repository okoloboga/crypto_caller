/**
 * Feature module for challenge-related functionality in the RUBLE Farming App backend.
 * This module encapsulates the logic for generating and verifying challenges for TON proof
 * authentication. It provides the ChallengeService and ChallengeController, and exports the
 * service for use in other modules.
 */

import { Module } from '@nestjs/common'; // Import Module decorator for defining NestJS modules
import { ChallengeService } from './challenge.service'; // Import the ChallengeService for business logic
import { ChallengeController } from './challenge.controller'; // Import the ChallengeController for HTTP endpoints

/**
 * ChallengeModule class defining the challenge feature module.
 * Configures the module by providing the ChallengeService, registering the ChallengeController,
 * and exporting the service for use in other modules.
 */
@Module({
  providers: [
    ChallengeService, // Provide the ChallengeService for dependency injection
  ],
  controllers: [
    ChallengeController, // Register the ChallengeController to handle HTTP requests
  ],
  exports: [
    ChallengeService, // Export the ChallengeService so other modules can use it
  ],
})
export class ChallengeModule {}