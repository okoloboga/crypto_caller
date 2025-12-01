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

  async findOne(walletAddress: string): Promise<User | null> {
    // Log the search operation
    console.log(`Ищем пользователя с walletAddress: ${walletAddress}`);
    const user = await this.userRepository.findOne({ where: { walletAddress } });

    if (!user) {
      console.log(`Пользователь с walletAddress ${walletAddress} не найден.`);
      return null;
    }

    console.log(`Пользователь найден:`, user);
    return user;
  }

  async createSubscription(walletAddress: string, phoneNumber: string): Promise<User> {
    // Log the subscription operation
    console.log(`Создание/обновление подписки для walletAddress: ${walletAddress}`);
    let user = await this.userRepository.findOne({ where: { walletAddress } });

    const currentDate = new Date();
    console.log(`Текущая дата: ${currentDate}`);

    if (!user) {
      // Create a new user if not found
      console.log(`Пользователь не найден. Создаём нового пользователя.`);
      user = this.userRepository.create({
        walletAddress,
        phoneNumber,
        subscriptionDate: currentDate,
      });
    } else {
      // Update the existing user's subscription
      console.log(`Пользователь найден. Обновляем данные.`);
      user.phoneNumber = phoneNumber;
      user.subscriptionDate = currentDate;
    }

    const savedUser = await this.userRepository.save(user);
    console.log(`Пользователь успешно сохранён:`, savedUser);
    return savedUser;
  }

  async updatePhoneNumber(walletAddress: string, phoneNumber: string): Promise<User | null> {
    // Log the phone number update operation
    console.log(`Обновление номера телефона для walletAddress: ${walletAddress}`);
    const user = await this.userRepository.findOne({ where: { walletAddress } });

    if (!user) {
      console.log(`Пользователь с walletAddress ${walletAddress} не найден.`);
      return null;
    }

    console.log(`Пользователь найден. Старый номер: ${user.phoneNumber}, Новый номер: ${phoneNumber}`);
    user.phoneNumber = phoneNumber;

    const savedUser = await this.userRepository.save(user);
    console.log(`Номер телефона успешно обновлён:`, savedUser);
    return savedUser;
  }

  /**
   * Update a user's points based on elapsed time and set the last points value.
   * Points accumulate over time at a fixed rate, with a cap at 50.
   * @param walletAddress - The wallet address of the user.
   * @param newPoints - The new points value to store in lastPoints.
   * @returns The updated points value.
   * @throws Error if the user is not found.
   */
  async updatePoints(walletAddress: string, newPoints: number): Promise<number> {
    const user = await this.userRepository.findOne({ where: { walletAddress } });

    if (!user) {
      console.error(`User with walletAddress ${walletAddress} not found.`);
      throw new Error(`User with walletAddress ${walletAddress} not found.`);
    }

    // Calculate the time elapsed since the last update
    const now = Date.now();
    const lastUpdated = user.lastUpdated ? user.lastUpdated.getTime() : now;
    let timeElapsed = (now - lastUpdated) / 5000; // Time difference in 5-second intervals
    
    console.log(`[updatePoints] Wallet: ${walletAddress}`);
    console.log(`[updatePoints] Now: ${now}, LastUpdated: ${lastUpdated}, TimeElapsed: ${timeElapsed} intervals`);
    console.log(`[updatePoints] Current points: ${user.points}, New points param: ${newPoints}`);

    // Protect against negative time (future dates) or too large time differences
    if (timeElapsed < 0) {
      console.warn(`[updatePoints] Negative timeElapsed detected: ${timeElapsed}. Setting to 0.`);
      timeElapsed = 0;
    }
    
    // Limit maximum timeElapsed to prevent instant fill (max 1 hour = 720 intervals of 5 seconds)
    const maxTimeElapsed = 720; // 1 hour in 5-second intervals
    if (timeElapsed > maxTimeElapsed) {
      console.warn(`[updatePoints] TimeElapsed too large: ${timeElapsed}. Limiting to ${maxTimeElapsed}.`);
      timeElapsed = maxTimeElapsed;
    }

    // Calculate new points based on accumulation rate
    const accumulationRate = 0.01; // Updated to match frontend
    let calculatedPoints = user.points + timeElapsed * accumulationRate;

    console.log(`[updatePoints] Accumulation rate: ${accumulationRate}, Calculated points before cap: ${calculatedPoints}`);

    // Cap points at 1000 (updated to match frontend)
    const maxPoints = 1000;
    if (calculatedPoints > maxPoints) {
      console.log(`[updatePoints] Points exceeded max (${maxPoints}), capping at ${maxPoints}`);
      calculatedPoints = maxPoints;
    }
    
    console.log(`[updatePoints] Final calculated points: ${calculatedPoints}`);

    // Update the user's points, last updated time, and last points
    user.points = calculatedPoints;
    user.lastUpdated = new Date();
    user.lastPoints = newPoints;

    await this.userRepository.save(user);

    return calculatedPoints;
  }

  /**
   * Claim points for a user, adding them to their total and resetting progress.
   * @param walletAddress - The wallet address of the user.
   * @param pointsToAdd - The points to add to the user's total.
   * @throws Error if the user is not found.
   */
  async claimPoints(walletAddress: string, pointsToAdd: number): Promise<void> {
    const user = await this.userRepository.findOne({ where: { walletAddress } });

    if (!user) {
      throw new Error(`User with walletAddress ${walletAddress} not found.`);
    }

    // Log the points claim operation
    console.log(`Claiming points for walletAddress: ${walletAddress}. Points to add: ${pointsToAdd}`);

    // Add the points to the user's total and reset progress
    user.points += pointsToAdd;
    user.lastUpdated = new Date();
    user.lastPoints = 0; // Reset accumulated points

    await this.userRepository.save(user);

    console.log(`Points claimed successfully. New points: ${user.points}`);
  }

  /**
   * Check the subscription status of a user by their wallet address.
   * A subscription is considered active if it was created within the last 30 days.
   * @param walletAddress - The wallet address of the user.
   * @returns A boolean indicating whether the subscription is active.
   */
  async checkSubscriptionStatus(walletAddress: string): Promise<boolean> {
    try {
      // Log the subscription status check
      console.log(`Проверяем статус подписки для walletAddress: ${walletAddress}`);

      const user = await this.userRepository.findOne({ where: { walletAddress } });

      if (!user) {
        console.log(`Пользователь с walletAddress ${walletAddress} не найден.`);
        return false;
      }

      if (!user.subscriptionDate) {
        console.log(`У пользователя нет даты подписки.`);
        return false;
      }

      // Calculate the difference in days between the subscription date and the current date
      const subscriptionDate = new Date(user.subscriptionDate);
      const currentDate = new Date();
      const daysDifference = Math.floor(
        (currentDate.getTime() - subscriptionDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      console.log(`Дата подписки: ${subscriptionDate}, Текущая дата: ${currentDate}, Разница дней: ${daysDifference}`);

      // Subscription is active if within 30 days
      const isActive = daysDifference <= 30;
      console.log(`Статус подписки активен: ${isActive}`);
      return isActive;
    } catch (error) {
      // Log and return false if an error occurs
      console.error(`Ошибка проверки подписки для walletAddress ${walletAddress}:`, error);
      return false;
    }
  }

  /**
   * Activate subscription for a user after successful swap and burn.
   * @param walletAddress - The wallet address of the user.
   * @returns The updated user.
   */
  async activateSubscription(walletAddress: string): Promise<User> {
    console.log(`🔄 Activating subscription for user: ${walletAddress}`);
    
    const user = await this.userRepository.findOne({ where: { walletAddress } });
    
    if (!user) {
      throw new Error(`User with walletAddress ${walletAddress} not found`);
    }

    // Update subscription date to current time (this extends the subscription)
    user.subscriptionDate = new Date();
    user.lastUpdated = new Date();
    
    const savedUser = await this.userRepository.save(user);
    console.log(`✅ Subscription activated successfully for user: ${walletAddress}`);
    return savedUser;
  }

  /**
   * Handle failed subscription (when swap or burn fails).
   * @param walletAddress - The wallet address of the user.
   * @param error - The error message from the failed operation.
   */
  async handleFailedSubscription(walletAddress: string, error: string): Promise<void> {
    console.log(`🔄 Handling failed subscription for user: ${walletAddress}`);
    console.log(`❌ Error details: ${error}`);
    
    // For now, we just log the failure. In the future, we might want to:
    // - Send notification to user
    // - Update user status
    // - Log to analytics
    
    console.log(`✅ Failed subscription handled for user: ${walletAddress}`);
  }
}