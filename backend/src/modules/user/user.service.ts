/**
 * Service for handling user-related operations in the RUBLE Farming App backend.
 * This service provides methods for managing users, including finding users, creating/updating
 * subscriptions, updating phone numbers, managing points (updating and claiming), and checking
 * subscription status. It interacts with the database using TypeORM and is part of the UserModule.
 */

import { Injectable } from '@nestjs/common'; // Import Injectable decorator for NestJS service
import { InjectRepository } from '@nestjs/typeorm'; // Import InjectRepository for repository injection
import { Repository } from 'typeorm'; // Import Repository for database operations
import { User } from './user.entity'; // Import the User entity for database mapping

/**
 * UserService class providing business logic for user management.
 * Handles user retrieval, subscription creation/updates, phone number updates, points management,
 * and subscription status checks.
 */
@Injectable()
export class UserService {
  /**
   * Constructor to inject dependencies.
   * @param userRepository - The repository for User entities.
   */
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * Find a user by their wallet address.
   * @param walletAddress - The wallet address of the user.
   * @returns The user if found, or null if not found.
   */
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

  /**
   * Create or update a user's subscription by associating a phone number with their wallet address.
   * If the user does not exist, a new user is created. If the user exists, their subscription is updated.
   * @param walletAddress - The wallet address of the user.
   * @param phoneNumber - The phone number to associate with the user.
   * @returns The created or updated user.
   */
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

  /**
   * Update the phone number of a user by their wallet address.
   * @param walletAddress - The wallet address of the user.
   * @param phoneNumber - The new phone number to set.
   * @returns The updated user, or null if the user is not found.
   */
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
    const timeElapsed = (now - lastUpdated) / 5000; // Time difference in seconds

    // Calculate new points based on accumulation rate
    const accumulationRate = 0.001;
    let calculatedPoints = user.points + timeElapsed * accumulationRate;

    // Cap points at 100
    if (calculatedPoints > 100) {
      calculatedPoints = 100;
    }

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
}