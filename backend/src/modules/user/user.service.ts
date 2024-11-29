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

  // Update points and last collected time
  async updatePoints(walletAddress: string): Promise<number> {
    const user = await this.userRepository.findOne({ where: { walletAddress } });
    if (!user) {
      throw new Error(`User with walletAddress ${walletAddress} not found.`);
    }
  
    // Логирование
    console.log(`Updating points for walletAddress: ${walletAddress}`);
  
    const now = Date.now();
    const lastUpdated = user.lastUpdated ? user.lastUpdated.getTime() : now;
    const timeElapsed = (now - lastUpdated) / (1000 * 60 * 60); // Разница в часах
  
    console.log(`Last updated: ${user.lastUpdated}, Time elapsed: ${timeElapsed} hours`);
  
    const accumulationRate = 2;  // Очки за 1 час
    let newPoints = user.points + timeElapsed * accumulationRate;
  
    if (newPoints > 50) {
      newPoints = 50;
    }
  
    console.log(`New points after calculation: ${newPoints}`);
  
    user.points = newPoints;
    user.lastUpdated = new Date();
    await this.userRepository.save(user);
  
    console.log(`Points updated successfully for walletAddress: ${walletAddress}`);
    return newPoints;
  }
  
  // Метод для сбора очков
  async claimPoints(walletAddress: string, pointsToAdd: number): Promise<void> {
    const user = await this.userRepository.findOne({ where: { walletAddress } });
    
    if (!user) {
      throw new Error(`User with walletAddress ${walletAddress} not found.`);
    }
  
    console.log(`Claiming points for walletAddress: ${walletAddress}. Points to add: ${pointsToAdd}`);
  
    user.points += pointsToAdd;
    user.lastUpdated = new Date();
  
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
