import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from './task.entity';
import { User } from '../user/user.entity';
import { NotificationService } from '../notification/notification.service';
import { OkxApiService } from '../../shared/okx-api.service';

@Injectable()
export class TaskService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    private notificationService: NotificationService,
    private readonly okxApiService: OkxApiService,
  ) {}

  async createTask(walletAddress: string, currencyPair: string, targetPrice: number): Promise<Task> {
    console.log(`Создание нового задания: ${JSON.stringify({ walletAddress, currencyPair, targetPrice })}`);
    try {
      const task = this.taskRepository.create({
        walletAddress,
        pair: currencyPair,
        targetPrice,
      });

      return await this.taskRepository.save(task);
    } catch (error) {
      throw new BadRequestException('Ошибка при создании задачи. Пожалуйста, проверьте данные.');
    }
  }

  async updateTask(id: number, updates: Partial<Task>): Promise<Task> {
    try {
      const existingTask = await this.taskRepository.findOne({ where: { id } });
      if (!existingTask) {
        throw new NotFoundException(`Задача с id ${id} не найдена.`);
      }

      await this.taskRepository.update(id, updates);
      return await this.taskRepository.findOneOrFail({ where: { id } });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Ошибка при обновлении задачи. Пожалуйста, проверьте данные.');
    }
  }

  async deleteTask(id: number): Promise<void> {
    try {
      const task = await this.taskRepository.findOne({ where: { id } });
      if (!task) {
        throw new NotFoundException(`Задача с id ${id} не найдена.`);
      }

      await this.taskRepository.delete(id);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Ошибка при удалении задачи.');
    }
  }

  async getTasksByUser(walletAddress: string): Promise<Task[]> {
    try {
      const tasks = await this.taskRepository.find({ where: { walletAddress } });
      if (!tasks.length) {
        console.log(`Задачи для пользователя с walletAddress ${walletAddress} не найдены.`);
      }
      return tasks;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Ошибка при получении задач для пользователя.');
    }
  }
  
  async executeTask(taskId: number): Promise<void> {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
    });
  
    if (task && task.walletAddress) {
      const user = await this.userRepository.findOne({
        where: { walletAddress: task.walletAddress },
      });
  
      if (user && user.phoneNumber) {
        await this.notificationService.makeCall(user.phoneNumber, taskId);
      }
    }
  }
  
  async checkTasksForPriceTriggers(): Promise<void> {
    const tasks = await this.taskRepository.find({ where: { isActive: true } });
  
    for (const task of tasks) {
      const currentPrice = await this.okxApiService.getCurrentPrice(task.pair);
  
      if (
        (task.isPriceAbove && currentPrice >= task.targetPrice) || 
        (!task.isPriceAbove && currentPrice <= task.targetPrice)
      ) {
        const user = await this.userRepository.findOne({
          where: { walletAddress: task.walletAddress },
        });
  
        if (user && user.phoneNumber) {
          await this.notificationService.makeCall(user.phoneNumber, task.id);
        }
  
        await this.taskRepository.remove(task);
      }
    }
  }
  
}