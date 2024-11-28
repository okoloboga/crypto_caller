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
    console.log(`Creating new task with data: walletAddress=${walletAddress}, currencyPair=${currencyPair}, targetPrice=${targetPrice}`);
    
    // Проверяем, существует ли уже задание с таким же walletAddress и currencyPair
    const existingTask = await this.taskRepository.findOne({ where: { walletAddress, currencyPair } });
    if (existingTask) {
      console.log('Task with the same walletAddress and currencyPair already exists.');
      throw new BadRequestException('Task with the same walletAddress and currencyPair already exists.');
    }
  
    try {
      const task = this.taskRepository.create({
        walletAddress,
        currencyPair,
        targetPrice,
      });
      console.log('Task object before saving:', task);
  
      const savedTask = await this.taskRepository.save(task);
      console.log('Task successfully created:', savedTask);
  
      const user = await this.userRepository.findOne({ where: { walletAddress } });
      if (!user) {
        console.log(`User with walletAddress ${walletAddress} not found.`);
        throw new Error(`User with walletAddress ${walletAddress} not found.`);
      }
  
      const updatedTaskIds = [...(user.taskIds || []), savedTask.id];
      user.taskIds = updatedTaskIds;
  
      await this.userRepository.save(user);
      console.log(`User task list updated: ${updatedTaskIds}`);
  
      return savedTask;
  
    } catch (error) {
      console.error('Error creating task or updating user task list:', error.message);
      throw new BadRequestException('Error creating task. Please check the data.');
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
  
      const user = await this.userRepository.findOne({ where: { walletAddress: task.walletAddress } });
      if (!user) {
        console.log(`User with walletAddress ${task.walletAddress} not found.`);
        throw new Error(`User with walletAddress ${task.walletAddress} not found.`);
      }
  
      user.taskIds = user.taskIds.filter((taskId) => taskId !== id);
  
      // Сохраняем обновленного пользователя
      await this.userRepository.save(user);
      console.log(`User's task list updated after deletion: ${user.taskIds}`);
      
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error during task deletion or user update:', error.message);
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
    const tasks = await this.taskRepository.find();
  
    for (const task of tasks) {
      const currentPrice = await this.okxApiService.getCurrentPrice(task.currencyPair);
  
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