/**
 * Controller for handling user-related operations in the RUBLE Farming App backend.
 * This controller provides endpoints for managing user subscriptions, retrieving user data,
 * updating phone numbers, and handling points (e.g., updating and claiming points).
 * It is part of the UserModule and uses the UserService to perform the actual operations.
 */

import { Controller, Post, Body, Param, Get, Patch, Query, BadRequestException, InternalServerErrorException } from '@nestjs/common'; // Import NestJS core decorators and exceptions
import { UserService } from './user.service'; // Import the UserService for business logic
import { RelayerService } from '../relayer/relayer.service'; // Import RelayerService for relayer integration

/**
 * UserController class handling user management endpoints.
 * Routes are prefixed with '/api/user' due to the global API prefix and controller path.
 */
@Controller('user')
export class UserController {
  /**
   * Constructor to inject dependencies.
   * @param userService - The service handling user-related operations.
   */
  constructor(
    private readonly userService: UserService,
    private readonly relayerService: RelayerService,
  ) {}

  /**
   * Create or update a user's subscription by associating a phone number with their wallet address.
   * Endpoint: POST /api/user/subscription
   * @param walletAddress - The wallet address of the user.
   * @param phoneNumber - The phone number to associate with the user.
   * @param txHash - The transaction hash from the blockchain.
   * @param amount - The amount paid for subscription.
   * @returns The result of the subscription creation/update.
   */
  @Post('subscription')
  async createSubscription(
    @Body('walletAddress') walletAddress: string,
    @Body('phoneNumber') phoneNumber: string,
    @Body('txHash') txHash: string,
    @Body('amount') amount: string,
  ) {
    // Store user data temporarily (don't create subscription yet)
    // User will be created only after successful swap + burn + callback
    console.log(`📝 Storing user data for processing: ${walletAddress}`);
    console.log(`📋 User data:`, {
      walletAddress,
      phoneNumber,
      txHash,
      amount
    });
    
    // Check relayer health first
    console.log(`🔍 Checking relayer health before notification...`);
    try {
      const isHealthy = await this.relayerService.checkHealth();
      console.log(`📊 Relayer health check: ${isHealthy ? '✅ Healthy' : '❌ Unhealthy'}`);
    } catch (healthError) {
      console.error(`❌ Relayer health check failed:`, healthError.message);
    }
    
    // Notify relayer about the subscription
    console.log(`🔄 Starting relayer notification for ${walletAddress}`);
    console.log(`📊 Relayer data:`, {
      userAddress: walletAddress,
      amount: amount,
      txHash: txHash,
      subscriptionContractAddress: process.env.SUBSCRIPTION_CONTRACT_ADDRESS || '',
    });
    
    try {
      const relayerResponse = await this.relayerService.processSubscription({
        userAddress: walletAddress,
        phoneNumber: phoneNumber,
        amount: amount,
        txHash: txHash,
        subscriptionContractAddress: process.env.SUBSCRIPTION_CONTRACT_ADDRESS || '',
      });
      
      console.log(`✅ Relayer notified successfully for ${walletAddress}`);
      console.log(`📋 Relayer response:`, relayerResponse);
    } catch (error) {
      console.error(`❌ Failed to notify relayer for ${walletAddress}:`);
      console.error(`🔍 Error details:`, {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
      // Don't throw error - user subscription is created, relayer notification is optional
    }
    
    return user;
  }

  /**
   * Check the subscription status of a user by their wallet address.
   * Endpoint: GET /api/user/subscription-status?walletAddress=<address>
   * @param walletAddress - The wallet address of the user (passed as a query parameter).
   * @returns A boolean indicating whether the user has an active subscription.
   * @throws BadRequestException if walletAddress is missing.
   * @throws InternalServerErrorException if the status check fails.
   */
  @Get('subscription-status')
  async getSubscriptionStatus(@Query('walletAddress') walletAddress: string): Promise<boolean> {
    // Validate the presence of walletAddress
    if (!walletAddress) {
      throw new BadRequestException('Wallet address is required');
    }
  
    try {
      // Return the subscription status directly
      return await this.userService.checkSubscriptionStatus(walletAddress);
    } catch (error) {
      // Log and throw an error if the status check fails
      console.error(`Ошибка получения статуса подписки для ${walletAddress}:`, error);
      throw new InternalServerErrorException('Ошибка получения статуса подписки');
    }
  }

  /**
   * Retrieve a user by their wallet address.
   * Endpoint: GET /api/user/:walletAddress
   * @param walletAddress - The wallet address of the user (passed as a URL parameter).
   * @returns The user object if found, or false if not found.
   */
  @Get(':walletAddress')
  async getUserByWalletAddress(@Param('walletAddress') walletAddress: string) {
    const user = await this.userService.findOne(walletAddress);
  
    if (!user) {
      return false;
    }
    return user;
  }

  /**
   * Update the phone number of a user by their wallet address.
   * Endpoint: PATCH /api/user/:walletAddress/phone
   * @param walletAddress - The wallet address of the user (passed as a URL parameter).
   * @param phoneNumber - The new phone number to set.
   * @returns The updated user object, or a message if the user is not found.
   */
  @Patch(':walletAddress/phone')
  async updatePhoneNumber(
    @Param('walletAddress') walletAddress: string,
    @Body('phoneNumber') phoneNumber: string,
  ) {
    const user = await this.userService.updatePhoneNumber(walletAddress, phoneNumber);
    if (!user) {
      return { message: `User not found with wallet address ${walletAddress}.` };
    }
    return user;
  }

  /**
   * Update a user's points (e.g., when the user logs into the app).
   * Endpoint: POST /api/user/update-points
   * @param body - The request body containing the wallet address and new points.
   * @param body.walletAddress - The wallet address of the user.
   * @param body.newPoints - The new points value to set.
   * @returns The updated points value.
   * @throws BadRequestException if walletAddress or newPoints is missing.
   * @throws BadRequestException if the update fails.
   */
  @Post('update-points')
  async updatePoints(@Body() { walletAddress, newPoints }: { walletAddress: string, newPoints: number }): Promise<number> {
    // Validate the presence of required fields
    if (!walletAddress) {
      throw new BadRequestException('Wallet address is required');
    }

    if (newPoints === undefined) {
      throw new BadRequestException('New points are required');
    }

    try {
      // Update the user's points and store the value in lastPoints
      const points = await this.userService.updatePoints(walletAddress, newPoints);
      console.log(`Points returned from updatePoints service: ${points}`);
      return points;
    } catch (error) {
      // Log and throw an error if the update fails
      console.error(`Error in update-points: ${error.message}`);
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Claim points for a user and add them to their account.
   * Endpoint: POST /api/user/claim-points
   * @param body - The request body containing the wallet address and points to claim.
   * @param body.walletAddress - The wallet address of the user.
   * @param body.points - The points to claim.
   * @returns A success message if the points are claimed successfully.
   * @throws BadRequestException if walletAddress or points is missing.
   * @throws InternalServerErrorException if the claim fails.
   */
  @Post('claim-points')
  async claimPoints(@Body() body: { walletAddress: string, points: number }) {
    const { walletAddress, points } = body;

    // Validate the presence of required fields
    if (!walletAddress || points === undefined || points === null) {
      throw new BadRequestException('Wallet address and points are required');
    }

    try {
      // Add the claimed points to the user's account
      await this.userService.claimPoints(walletAddress, points);
      return { message: 'Points successfully claimed and added to the user\'s account.' };
    } catch (error) {
      // Log and throw an error if the claim fails
      console.error('Error claiming points:', error);
      throw new InternalServerErrorException('Error claiming points.');
    }
  }
}