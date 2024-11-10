import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  // Register a user based on their Telegram ID
  async registerUser(telegramId: string, phoneNumber?: string): Promise<User> {
    let user = await this.userRepository.findOne({ where: { telegramId } });

    if (!user) {
      user = this.userRepository.create({ telegramId, phoneNumber });
      await this.userRepository.save(user);
    }

    return user;
  }

  // Find user by ID
  async findOne(userId: number): Promise<User | null> {
    return this.userRepository.findOne({ where: { id: userId } });
  }

  // Update subscription status
  async updateSubscriptionStatus(userId: number, status: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (user) {
      user.subscriptionStatus = status;
      await this.userRepository.save(user);
    }
    return user;
  }

  // Update points and last collected time
  async updatePoints(userId: number, points: number, lastCollectedAt: Date): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (user) {
      user.points = points;
      user.lastPointsCollectedAt = lastCollectedAt;
      await this.userRepository.save(user);
    }
    return user;
  }

  // Get user by Telegram ID
  async findUserByTelegramId(telegramId: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { telegramId } });
  }

  async findActiveSubscribedUsers(): Promise<User[]> {
    return this.userRepository.find({ where: { subscriptionStatus: 'active' } });
  }
}