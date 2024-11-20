import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  // Find user by ID
  async findOne(walletAddress: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { walletAddress: walletAddress } });
  }

  // Create user subscription based on walletAddress
  async createSubscription(walletAddress: string, phoneNumber: string): Promise<User> {
    let user = await this.userRepository.findOne({ where: { walletAddress } });

    if (!user) {

      user = this.userRepository.create({ walletAddress, phoneNumber, subscriptionStatus: 'active' });
    } else {

      user.phoneNumber = phoneNumber;
      user.subscriptionStatus = 'active';
    }

    await this.userRepository.save(user);
    return user;
  }

  // Update phone number of a user by Wallet Address
  async updatePhoneNumber(walletAddress: string, phoneNumber: string): Promise<User | null> {
    const user = await this.userRepository.findOne({ where: { walletAddress } });

    if (!user) {
      return null; // Пользователь не найден
    }

    user.phoneNumber = phoneNumber; // Обновляем номер телефона
    await this.userRepository.save(user); // Сохраняем изменения
    return user; // Возвращаем обновленного пользователя
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

  async findActiveSubscribedUsers(): Promise<User[]> {
    return this.userRepository.find({ where: { subscriptionStatus: 'active' } });
  }
}