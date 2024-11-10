import { Controller, Post, Patch, Delete, Get, Body, Param } from '@nestjs/common';
import { TaskService } from './task.service';
import { Task } from '../task.entity';

@Controller('task')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post()
  async createTask(
    @Body('userId') userId: number,
    @Body('currencyPair') currencyPair: string,
    @Body('targetPrice') targetPrice: number,
  ) {
    return this.taskService.createTask({ id: userId } as any, currencyPair, targetPrice);
  }

  @Patch(':id')
  async updateTask(@Param('id') id: number, @Body() updates: Partial<Task>) {
    return this.taskService.updateTask(id, updates);
  }

  @Delete(':id')
  async deleteTask(@Param('id') id: number) {
    return this.taskService.deleteTask(id);
  }

  @Get('user/:userId')
  async getTasksByUser(@Param('userId') userId: number) {
    return this.taskService.getTasksByUser(userId);
  }
}