/**
 * Controller for handling task-related operations in the RUBLE Farming App backend.
 * This controller provides endpoints for creating, updating, deleting, and retrieving tasks
 * for price monitoring. It is part of the TaskModule and uses the TaskService to perform
 * the actual operations.
 */

import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common'; // Import NestJS core decorators
import { TaskService } from './task.service'; // Import the TaskService for business logic
import { Task } from './task.entity'; // Import the Task entity for type definitions

/**
 * TaskController class handling task management endpoints.
 * Routes are prefixed with '/api/task' due to the global API prefix and controller path.
 */
@Controller('task')
export class TaskController {
  /**
   * Constructor to inject dependencies.
   * @param taskService - The service handling task-related operations.
   */
  constructor(private readonly taskService: TaskService) {}

  /**
   * Create a new task for price monitoring.
   * Endpoint: POST /api/task
   * @param walletAddress - The wallet address of the user creating the task.
   * @param currencyPair - The currency pair to monitor (e.g., "BTC/USD").
   * @param targetPrice - The target price to trigger the task.
   * @param isPriceAbove - Whether the task triggers when the price is above (true) or below (false) the target.
   * @returns The created task.
   * @throws Error if task creation fails.
   */
  @Post()
  async createTask(
    @Body('walletAddress') walletAddress: string,
    @Body('currencyPair') currencyPair: string,
    @Body('targetPrice') targetPrice: number,
    @Body('isPriceAbove') isPriceAbove: boolean,
  ) {
    // Log the incoming request data for debugging
    console.log('Создание задания:');
    console.log('walletAddress:', walletAddress);
    console.log('currencyPair:', currencyPair);
    console.log('targetPrice:', targetPrice);
    console.log('isPriceAbove:', isPriceAbove);

    try {
      // Delegate task creation to the TaskService
      const task = await this.taskService.createTask(walletAddress, currencyPair, targetPrice, isPriceAbove);
      console.log('Задание успешно создано:', task);
      return task;
    } catch (error) {
      // Log and rethrow the error
      console.error('Ошибка при создании задания:', error.message);
      throw error;
    }
  }

  /**
   * Update an existing task.
   * Endpoint: PATCH /api/task/:id
   * @param id - The ID of the task to update.
   * @param updates - Partial task data to update.
   * @returns The updated task.
   * @throws Error if task update fails.
   */
  @Patch(':id')
  async updateTask(
    @Param('id') id: number,
    @Body() updates: Partial<Task>,
  ) {
    // Log the update request for debugging
    console.log('Обновление задания с ID:', id);
    console.log('Обновляемые данные:', updates);

    try {
      // Delegate task update to the TaskService
      const updatedTask = await this.taskService.updateTask(id, updates);
      console.log('Задание успешно обновлено:', updatedTask);
      return updatedTask;
    } catch (error) {
      // Log and rethrow the error
      console.error(`Ошибка при обновлении задания с ID ${id}:`, error.message);
      throw error;
    }
  }

  /**
   * Delete a task by its ID.
   * Endpoint: DELETE /api/task/:id
   * @param id - The ID of the task to delete.
   * @returns A success message confirming deletion.
   * @throws Error if task deletion fails.
   */
  @Delete(':id')
  async deleteTask(@Param('id') id: number) {
    // Log the deletion request for debugging
    console.log('Удаление задания с ID:', id);

    try {
      // Delegate task deletion to the TaskService
      await this.taskService.deleteTask(id);
      console.log('Задание успешно удалено.');
      return { message: 'Task deleted successfully' };
    } catch (error) {
      // Log and rethrow the error
      console.error(`Ошибка при удалении задания с ID ${id}:`, error.message);
      throw error;
    }
  }

  /**
   * Retrieve all tasks for a specific user by their wallet address.
   * Endpoint: GET /api/task/user/:walletAddress
   * @param walletAddress - The wallet address of the user whose tasks are being retrieved.
   * @returns An array of tasks associated with the user.
   * @throws Error if task retrieval fails.
   */
  @Get('user/:walletAddress')
  async getTasksByUser(@Param('walletAddress') walletAddress: string) {
    // Log the retrieval request for debugging
    console.log('Получение списка заданий для walletAddress:', walletAddress);

    try {
      // Delegate task retrieval to the TaskService
      const tasks = await this.taskService.getTasksByUser(walletAddress);
      console.log('Список заданий успешно получен:', tasks);
      return tasks;
    } catch (error) {
      // Log and rethrow the error
      console.error(`Ошибка при получении заданий для walletAddress ${walletAddress}:`, error.message);
      throw error;
    }
  }
}