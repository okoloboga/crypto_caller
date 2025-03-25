/**
 * Feature module for TON blockchain integration in the RUBLE Farming App backend.
 * This module encapsulates the logic for interacting with the TON blockchain, providing
 * the TonService for blockchain-related operations (e.g., wallet interactions, withdrawals).
 * It exports the TonService for use in other modules, such as for handling withdrawals.
 */

import { Module } from '@nestjs/common'; // Import Module decorator for defining NestJS modules
import { TonService } from './ton.service'; // Import the TonService for TON blockchain operations

/**
 * TonModule class defining the TON blockchain feature module.
 * Configures the module by providing the TonService and exporting it for use in other modules.
 */
@Module({
  providers: [
    TonService, // Provide the TonService for dependency injection
  ],
  exports: [
    TonService, // Export the TonService for use in other modules (e.g., WithdrawalController)
  ],
})
export class TonModule {}