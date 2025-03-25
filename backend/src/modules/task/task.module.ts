/**
 * Feature module for task-related functionality in the RUBLE Farming App backend.
 * This module encapsulates the logic for managing price monitoring tasks, including
 * creating, updating, deleting, and retrieving tasks. It provides the TaskService and
 * TaskController, integrates with the Task entity for database operations, and imports
 * related modules (SharedModule, NotificationModule, UserModule) for dependencies.
 */

import { Module, forwardRef } from '@nestjs/common'; // Import Module and forwardRef for circular dependencies
import { TypeOrmModule } from '@nestjs/typeorm'; // Import TypeOrmModule for database integration
import { Task } from './task.entity'; // Import the Task entity for database mapping
import { TaskService } from './task.service'; // Import the TaskService for business logic
import { TaskController } from './task.controller'; // Import the TaskController for HTTP endpoints
import { SharedModule } from '../../shared/shared.module'; // Import SharedModule for shared utilities
import { NotificationModule } from '../notification/notification.module'; // Import NotificationModule for notification-related dependencies
import { UserModule } from '../user/user.module'; // Import UserModule for user-related dependencies

/**
 * TaskModule class defining the task feature module.
 * Configures the module by providing the TaskService, registering the TaskController,
 * setting up TypeORM for the Task entity, and importing related modules (SharedModule,
 * NotificationModule, UserModule). It also exports the TaskService for use in other modules.
 */
@Module({
  imports: [
    // Configure TypeORM to use the Task entity for database operations
    TypeOrmModule.forFeature([Task]),

    // Import SharedModule for access to shared utilities (e.g., HTTP service for price fetching)
    SharedModule,

    // Use forwardRef to handle circular dependency with NotificationModule
    forwardRef(() => NotificationModule),

    // Import UserModule to access user-related services and entities
    UserModule,
  ],
  providers: [
    TaskService, // Provide the TaskService for dependency injection
  ],
  controllers: [
    TaskController, // Register the TaskController to handle HTTP requests
  ],
  exports: [
    TaskService, // Export the TaskService for use in other modules (e.g., PriceMonitorModule)
  ],
})
export class TaskModule {}