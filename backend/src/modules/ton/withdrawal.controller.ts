/**
 * Controller for handling withdrawal-related operations in the RUBLE Farming App backend.
 * This controller provides an endpoint for sending Jetton tokens on the TON blockchain
 * as part of a withdrawal process. It uses the TonService to perform the token transfer.
 * While defined in app.module.ts, it is closely related to the TonModule.
 */

import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common'; // Import NestJS core decorators and exceptions
import { TonService } from './ton.service'; // Import the TonService for TON blockchain operations

/**
 * WithdrawalController class handling withdrawal endpoints.
 * Routes are prefixed with '/api/withdrawal' due to the global API prefix and controller path.
 */
@Controller('withdrawal')
export class WithdrawalController {
  /**
   * Constructor to inject dependencies.
   * @param tonService - The service for TON blockchain operations, used to send tokens.
   */
  constructor(private readonly tonService: TonService) {}

  /**
   * Send Jetton tokens to a recipient address as part of a withdrawal.
   * Endpoint: POST /api/withdrawal/send-tokens
   * @param body - The request body containing the recipient address and amount.
   * @param body.recipientAddress - The TON address of the recipient.
   * @param body.amount - The amount of Jetton tokens to send (as a string).
   * @returns The result of the token transfer operation.
   * @throws HttpException with BAD_REQUEST if recipientAddress or amount is missing.
   * @throws HttpException with INTERNAL_SERVER_ERROR if the token transfer fails.
   */
  @Post('send-tokens')
  async sendTokens(@Body() body: { recipientAddress: string; amount: string }) {
    const { recipientAddress, amount } = body;

    // Validate the presence of required fields
    if (!recipientAddress || !amount) {
      throw new HttpException('Missing recipientAddress or amount', HttpStatus.BAD_REQUEST);
    }

    try {
      // Delegate the token transfer to the TonService
      const result = await this.tonService.sendTokens(recipientAddress, amount);
      return result;
    } catch (error) {
      // Throw an HTTP exception with the error message
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}