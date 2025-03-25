/**
 * Service for handling task-related operations in the RUBLE Farming App backend.
 * This service provides methods for creating, updating, deleting, retrieving, and executing
 * price monitoring tasks. It integrates with the NotificationService to send notifications
 * when price triggers are met and uses the OkxApiService to fetch current prices.
 * It is part of the TaskModule.
 */

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'; // Import NestJS core exceptions
import { InjectRepository } from '@nestjs/typeorm'; // Import InjectRepository for repository injection
import { Repository } from 'typeorm'; // Import Repository for database operations
import { Task } from './task.entity'; // Import the Task entity for database mapping
import { User } from '../user/user.entity'; // Import the User entity for database mapping
import { NotificationService } from '../notification/notification.service'; // Import NotificationService for sending notifications
import { OkxApiService } from '../../shared/okx-api.service'; // Import OkxApiService for fetching prices

/**
 * TaskService class providing business logic for task management.
 * Handles task creation, updates, deletion, retrieval, and execution for price monitoring.
 * Interacts with the database via TypeORM repositories and integrates with external services
 * for notifications and price data.
 */
@Injectable()
export class TaskService {
  /**
   * Constructor to inject dependencies.
   * @param taskRepository - The repository for Task entities.
   * @param userRepository - The repository for User entities.
   * @param notificationService - The service for sending notifications.
   * @param okxApiService - The service for fetching current prices from OKX API.
   */
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    private notificationService: NotificationService,
    private readonly okxApiService: OkxApiService,
  ) {}

  /**
   * Create a new task for price monitoring.
   * Ensures no duplicate tasks exist for the same wallet address and currency pair.
   * Updates the user's task list with the new task ID.
   * @param walletAddress - The wallet address of the user creating the task.
   * @param currencyPair - The currency pair to monitor (e.g., "BTC/USD").
   * @param targetPrice - The target price to trigger the task.
   * @param isPriceAbove - Whether the task triggers when the price is above (true) or below (false) the target.
   * @returns The created task.
   * @throws BadRequestException if a task with the same wallet address and currency pair already exists.
   * @throws Error if the user is not found.
   */
  async createTask(walletAddress: string, currencyPair: string, targetPrice: number, isPriceAbove: boolean): Promise<Task> {
    // Log the incoming data for debugging
    console.log(`Creating new task with data: walletAddress=${walletAddress}, currencyPair=${currencyPair}, targetPrice=${targetPrice}, isPriceAbove=${isPriceAbove}`);
    
    // Check for duplicate tasks
    const existingTask = await this.taskRepository.findOne({ where: { walletAddress, currencyPair } });
    if (existingTask) {
      console.log('Task with the same walletAddress and currencyPair already exists.');
      throw new BadRequestException('Task with the same walletAddress and currencyPair already exists.');
    }
  
    try {
      // Create a new task entity
      const task = this.taskRepository.create({
        walletAddress,
        currencyPair,
        targetPrice,
        isPriceAbove,
      });
      console.log('Task object before saving:', task);
  
      // Save the task to the database
      const savedTask = await this.taskRepository.save(task);
      console.log('Task successfully created:', savedTask);
  
      // Find the user associated with the wallet address
      const user = await this.userRepository.findOne({ where: { walletAddress } });
      if (!user) {
        console.log(`User with walletAddress ${walletAddress} not found.`);
        throw new Error(`User with walletAddress ${walletAddress} not found.`);
      }
  
      // Update the user's task list
      const updatedTaskIds = [...(user.taskIds || []), savedTask.id];
      user.taskIds = updatedTaskIds;
  
      await this.userRepository.save(user);
      console.log(`User task list updated: ${updatedTaskIds}`);
  
      return savedTask;
    } catch (error) {
      // Log and throw a generic error
      console.error('Error creating task or updating user task list:', error.message);
      throw new BadRequestException('Error creating task. Please check the data.');
    }
  }
    
  /**
   * Update an existing task with the provided data.
   * @param id - The ID of the task to update.
   * @param updates - Partial task data to update.
   * @returns The updated task.
   * @throws NotFoundException if the task is not found.
   * @throws BadRequestException if the update fails.
   */
  async updateTask(id: number, updates: Partial<Task>): Promise<Task> {
    try {
      // Check if the task exists
      const existingTask = await this.taskRepository.findOne({ where: { id } });
      if (!existingTask) {
        throw new NotFoundException(`Задача с id ${id} не найдена.`);
      }

      // Update the task in the database
      await this.taskRepository.update(id, updates);
      return await this.taskRepository.findOneOrFail({ where: { id } });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Ошибка при обновлении задачи. Пожалуйста, проверьте данные.');
    }
  }

  /**
   * Delete a task by its ID and update the user's task list.
   * @param id - The ID of the task to delete.
   * @throws NotFoundException if the task is not found.
   * @throws Error if the user is not found.
   * @throws BadRequestException if deletion fails.
   */
  async deleteTask(id: number): Promise<void> {
    try {
      // Check if the task exists
      const task = await this.taskRepository.findOne({ where: { id } });
      if (!task) {
        throw new NotFoundException(`Задача с id ${id} не найдена.`);
      }
  
      // Delete the task from the database
      await this.taskRepository.delete(id);
  
      // Find the user associated with the task
      const user = await this.userRepository.findOne({ where: { walletAddress: task.walletAddress } });
      if (!user) {
        console.log(`User with walletAddress ${task.walletAddress} not found.`);
        throw new Error(`User with walletAddress ${task.walletAddress} not found.`);
      }
  
      // Update the user's task list by removing the deleted task ID
      const updatedTaskIds = user.taskIds.filter((taskId) => taskId !== id);
      user.taskIds = updatedTaskIds;

      console.log(`User's task list after deletion: ${user.taskIds} = ${updatedTaskIds}`);

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

  /**
   * Retrieve all tasks for a specific user by their wallet address.
   * @param walletAddress - The wallet address of the user.
   * @returns An array of tasks associated with the user.
   * @throws BadRequestException if retrieval fails.
   */
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
  
  /**
   * Execute a specific task by sending a notification if the user has a phone number.
   * @param taskId - The ID of the task to execute.
   */
  async executeTask(taskId: number): Promise<void> {
    // Find the task by ID
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
    });
  
    if (task && task.walletAddress) {
      // Find the user associated with the task
      const user = await this.userRepository.findOne({
        where: { walletAddress: task.walletAddress },
      });
  
      // If the user exists and has a phone number, send a notification
      if (user && user.phoneNumber) {
        await this.notificationService.makeCall(user.phoneNumber, taskId);
      }
    }
  }
  
  /**
   * Check all tasks for price triggers and execute them if conditions are met.
   * Fetches the current price for each task's currency pair, compares it with the target price,
   * sends a notification if the condition is met, and deletes the task.
   */
  async checkTasksForPriceTriggers(): Promise<void> {
    // Retrieve all tasks from the database
    const tasks = await this.taskRepository.find();
  
    for (const task of tasks) {
      try {
        // Fetch the current price for the task's currency pair
        const currentPrice = await this.okxApiService.getCurrentPrice(task.currencyPair);
  
        // Check if the price condition is met
        if (
          (task.isPriceAbove && currentPrice >= task.targetPrice) || 
          (!task.isPriceAbove && currentPrice <= task.targetPrice)
        ) {
          // Find the user associated with the task
          const user = await this.userRepository.findOne({ where: { walletAddress: task.walletAddress } });
  
          // If the user exists and has a phone number, send a notification
          if (user && user.phoneNumber) {
            await this.notificationService.makeCall(user.phoneNumber, task.id);
          }
  
          // Delete the task from the database
          await this.taskRepository.remove(task);
          
          // Update the user's task list by removing the deleted task ID
          user.taskIds = user.taskIds.filter((taskId) => taskId !== task.id);
          await this.userRepository.save(user);
        }
      } catch (error) {
        console.error('Error while processing task:', error.message);
      }
    }
  }
}