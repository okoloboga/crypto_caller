import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription } from '../subscription.entity';
import { User } from '../../user/user.entity';  // Импортируем User

@Injectable()
export class SubscriptionService {
  constructor(
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
  ) {}

  // Check if user has an active subscription
  async isActiveSubscription(userId: number): Promise<boolean> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { user: { id: userId }, isActive: true },
    });
    return subscription ? true : false;
  }

  // Create a subscription for a user
  async createSubscription(user: User, expirationDate: Date): Promise<Subscription> {
    const subscription = new Subscription();
    subscription.user = user;
    subscription.isActive = true;
    subscription.expirationDate = expirationDate;

    return this.subscriptionRepository.save(subscription);
  }

  // Deactivate a user's subscription
  async deactivateSubscription(userId: number): Promise<void> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { user: { id: userId } },
    });

    if (subscription) {
      subscription.isActive = false;
      await this.subscriptionRepository.save(subscription);
    }
  }

  // Get active subscription for a user
  async getSubscriptionByUser(userId: number): Promise<Subscription> {
    return this.subscriptionRepository.findOne({
      where: { user: { id: userId }, isActive: true },
    });
  }
}