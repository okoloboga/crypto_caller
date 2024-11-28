import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { TaskService } from './task.service';
import { Task } from './task.entity';

@Controller('task')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post()
  async createTask(
    @Body('walletAddress') walletAddress: string,
    @Body('currencyPair') currencyPair: string,
    @Body('targetPrice') targetPrice: number,
    @Body('isPriceAbove') isPriceAbove: boolean,
  ) {
    console.log('Создание задания:');
    console.log('walletAddress:', walletAddress);
    console.log('currencyPair:', currencyPair);
    console.log('targetPrice:', targetPrice);
    console.log('isPriceAbove:', isPriceAbove);

    try {
      const task = await this.taskService.createTask(walletAddress, currencyPair, targetPrice, isPriceAbove);
      console.log('Задание успешно создано:', task);
      return task;
    } catch (error) {
      console.error('Ошибка при создании задания:', error.message);
      throw error;
    }
  }

  @Patch(':id')
  async updateTask(
    @Param('id') id: number,
    @Body() updates: Partial<Task>,
  ) {
    console.log('Обновление задания с ID:', id);
    console.log('Обновляемые данные:', updates);

    try {
      const updatedTask = await this.taskService.updateTask(id, updates);
      console.log('Задание успешно обновлено:', updatedTask);
      return updatedTask;
    } catch (error) {
      console.error(`Ошибка при обновлении задания с ID ${id}:`, error.message);
      throw error;
    }
  }

  @Delete(':id')
  async deleteTask(@Param('id') id: number) {
    console.log('Удаление задания с ID:', id);

    try {
      await this.taskService.deleteTask(id);
      console.log('Задание успешно удалено.');
      return { message: 'Task deleted successfully' };
    } catch (error) {
      console.error(`Ошибка при удалении задания с ID ${id}:`, error.message);
      throw error;
    }
  }

  @Get('user/:walletAddress')
  async getTasksByUser(@Param('walletAddress') walletAddress: string) {
    console.log('Получение списка заданий для walletAddress:', walletAddress);

    try {
      const tasks = await this.taskService.getTasksByUser(walletAddress);
      console.log('Список заданий успешно получен:', tasks);
      return tasks;
    } catch (error) {
      console.error(`Ошибка при получении заданий для walletAddress ${walletAddress}:`, error.message);
      throw error;
    }
  }
}
