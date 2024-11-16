import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription } from './subscription.entity';
import { UserService } from '../user/user.service';

@Injectable()
export class SubscriptionService {
  constructor(private readonly userService: UserService) {}

  // Check if the user has an active subscription
  async checkSubscription(telegramId: string) {
    const user = await this.userService.findUserByTelegramId(telegramId);
    if (!user) {
      throw new Error('User not found');
    }
    return {
      isActive: user.subscriptionStatus === 'active',
      phoneNumber: user.phoneNumber,
    };
  }

  // Create a subscription
  async createSubscription(telegramId: string, phoneNumber: string) {
    const user = await this.userService.findUserByTelegramId(telegramId);
    if (!user) {
      throw new Error('User not found');
    }

    user.subscriptionStatus = 'active';
    user.phoneNumber = phoneNumber;
    return this.userService.updateSubscriptionStatus(user.id, 'active');
  }

  // Cancel a subscription
  async cancelSubscription(telegramId: string) {
    const user = await this.userService.findUserByTelegramId(telegramId);
    if (!user) {
      throw new Error('User not found');
    }

    user.subscriptionStatus = 'inactive';
    user.phoneNumber = null; // Удаляем номер телефона
    return this.userService.updateSubscriptionStatus(user.id, 'inactive');
  }
}