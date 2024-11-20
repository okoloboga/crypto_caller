import { Injectable } from '@nestjs/common';
import { UserService } from '../user/user.service';

@Injectable()
export class SubscriptionService {
  constructor(private readonly userService: UserService) {}

  // Check if the user has an active subscription
  async checkSubscription(walletAddress: string) {
    const user = await this.userService.findOne(walletAddress);
    if (!user) {
      throw new Error('User not found');
    }
    return {
      isActive: user.subscriptionStatus === 'active',
      phoneNumber: user.phoneNumber,
    };
  }

  // Create a subscription
  async createSubscription(walletAddress: string, phoneNumber: string) {
    const user = await this.userService.findOne(walletAddress);
    if (!user) {
      throw new Error('User not found');
    }

    user.subscriptionStatus = 'active';
    user.phoneNumber = phoneNumber;
    return this.userService.createSubscription(user.walletAddress, 'active');
  }
}