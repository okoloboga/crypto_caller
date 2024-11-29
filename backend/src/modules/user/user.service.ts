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
    console.log(`Ищем пользователя с walletAddress: ${walletAddress}`);
    const user = await this.userRepository.findOne({ where: { walletAddress } });

    if (!user) {
      console.log(`Пользователь с walletAddress ${walletAddress} не найден.`);
      return null;
    }

    console.log(`Пользователь найден:`, user);
    return user;
  }

  // Create user subscription based on walletAddress
  async createSubscription(walletAddress: string, phoneNumber: string): Promise<User> {
    console.log(`Создание/обновление подписки для walletAddress: ${walletAddress}`);
    let user = await this.userRepository.findOne({ where: { walletAddress } });

    const currentDate = new Date();
    console.log(`Текущая дата: ${currentDate}`);

    if (!user) {
      console.log(`Пользователь не найден. Создаём нового пользователя.`);
      user = this.userRepository.create({
        walletAddress,
        phoneNumber,
        subscriptionDate: currentDate,
      });
    } else {
      console.log(`Пользователь найден. Обновляем данные.`);
      user.phoneNumber = phoneNumber;
      user.subscriptionDate = currentDate;
    }

    const savedUser = await this.userRepository.save(user);
    console.log(`Пользователь успешно сохранён:`, savedUser);
    return savedUser;
  }

  // Update phone number of a user by Wallet Address
  async updatePhoneNumber(walletAddress: string, phoneNumber: string): Promise<User | null> {
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

  // Update points and last collected time// Обновление очков и сохранение временного прогресса в lastPoints
  async updatePoints(walletAddress: string, newPoints: number): Promise<number> {
    console.log(`updatePoints called for walletAddress: ${walletAddress}`); // Логируем начало работы функции

    const user = await this.userRepository.findOne({ where: { walletAddress } });

    if (!user) {
      console.error(`User with walletAddress ${walletAddress} not found.`);  // Логируем, если пользователь не найден
      throw new Error(`User with walletAddress ${walletAddress} not found.`);
    }

    // Логирование информации о пользователе
    console.log(`User found: ${JSON.stringify(user, null, 2)}`);

    const now = Date.now();
    const lastUpdated = user.lastUpdated ? user.lastUpdated.getTime() : now;
    const timeElapsed = (now - lastUpdated) / (1000 * 60 * 60); // Разница в часах

    console.log(`Last updated: ${user.lastUpdated}, Time elapsed: ${timeElapsed} hours`);

    const accumulationRate = 2;  // Очки за 1 час
    let calculatedPoints = user.points + timeElapsed * accumulationRate;

    if (calculatedPoints > 50) {
      calculatedPoints = 50;
    }

    console.log(`New points after calculation: ${calculatedPoints}`);

    // Обновляем данные пользователя
    user.points = calculatedPoints; // Обновляем текущие очки
    user.lastUpdated = new Date(); // Обновляем время последнего обновления
    user.lastPoints = newPoints; // Сохраняем временные накопленные очки в lastPoints

    await this.userRepository.save(user);

    console.log(`Points updated successfully for walletAddress: ${walletAddress}`);
    return calculatedPoints;
  }


  // Сбор очков
  async claimPoints(walletAddress: string, pointsToAdd: number): Promise<void> {
    const user = await this.userRepository.findOne({ where: { walletAddress } });

    if (!user) {
      throw new Error(`User with walletAddress ${walletAddress} not found.`);
    }

    console.log(`Claiming points for walletAddress: ${walletAddress}. Points to add: ${pointsToAdd}`);

    user.points += pointsToAdd;
    user.lastUpdated = new Date();
    user.lastPoints = 0;  // Обнуляем накопленные очки

    await this.userRepository.save(user);

    console.log(`Points claimed successfully. New points: ${user.points}`);
  }

  
  // Check subscription status
  async checkSubscriptionStatus(walletAddress: string): Promise<boolean> {
    try {
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

      const subscriptionDate = new Date(user.subscriptionDate);
      const currentDate = new Date();
      const daysDifference = Math.floor(
        (currentDate.getTime() - subscriptionDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      console.log(`Дата подписки: ${subscriptionDate}, Текущая дата: ${currentDate}, Разница дней: ${daysDifference}`);

      const isActive = daysDifference <= 30;
      console.log(`Статус подписки активен: ${isActive}`);
      return isActive;
    } catch (error) {
      console.error(`Ошибка проверки подписки для walletAddress ${walletAddress}:`, error);
      return false; // В случае ошибки возвращаем false
    }
  }

}
