import { Injectable } from '@nestjs/common';
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
    private notificationService: NotificationService,
    private readonly okxApiService: OkxApiService,
  ) {}

  async createTask(user: User, pair: string, targetPrice: number): Promise<Task> {
    const task = this.taskRepository.create({ user, pair, targetPrice });
    return this.taskRepository.save(task);
  }

  async updateTask(id: number, updates: Partial<Task>): Promise<Task> {
    await this.taskRepository.update(id, updates);
    return this.taskRepository.findOneOrFail({ where: { id } });
  }

  async deleteTask(id: number): Promise<void> {
    await this.taskRepository.delete(id);
  }

  async getTasksByUser(walletAddress: string): Promise<Task[]> {
    console.log('Getting tasks for walletAddress:', walletAddress);
  
    return this.taskRepository
      .createQueryBuilder('task')  // Задаем псевдоним для таблицы "task"
      .innerJoinAndSelect('task.user', 'user')  // Делаем join с таблицей пользователя
      .where('user.walletAddress = :walletAddress', { walletAddress })  // Условие поиска по walletAddress
      .getMany();  // Получаем все задачи, удовлетворяющие условию
  }
  
  
  async executeTask(taskId: number): Promise<void> {
    const task = await this.taskRepository.findOne({ where: { id: taskId } });

    if (task) {
      const task = await this.taskRepository.findOne({ where: { id: taskId }, relations: ['user'] });
      if (task && task.user) {
        const user = task.user;
        await this.notificationService.makeCall(user.phoneNumber, taskId); // обновлено ниже
      }
    }
  }

  async checkTasksForPriceTriggers(): Promise<void> {
    const tasks = await this.taskRepository.find({ where: { isActive: true } });

    for (const task of tasks) {
      const currentPrice = await this.okxApiService.getCurrentPrice(task.pair); // Получаем текущую цену

      if ((task.isPriceAbove && currentPrice >= task.targetPrice) || 
          (!task.isPriceAbove && currentPrice <= task.targetPrice)) {
        await this.notificationService.makeCall(task.user.phoneNumber, task.id);
        await this.taskRepository.remove(task); // Удаляем задание после выполнения
      }
    }
  }
}