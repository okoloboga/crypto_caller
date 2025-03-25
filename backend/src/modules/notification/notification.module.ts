/**
 * Feature module for notification-related functionality in the RUBLE Farming App backend.
 * This module encapsulates the logic for managing notifications, such as initiating phone calls
 * for tasks. It provides the NotificationService, NotificationController, and integrates with
 * the Notification entity, UserModule, and TaskModule for database operations and relationships.
 */

import { Module, forwardRef } from '@nestjs/common'; // Import Module and forwardRef for circular dependencies
import { NotificationService } from './notification.service'; // Import the NotificationService for business logic
import { NotificationController } from './notification.controller'; // Import the NotificationController for HTTP endpoints
import { TypeOrmModule } from '@nestjs/typeorm'; // Import TypeOrmModule for database integration
import { Notification } from './notification.entity'; // Import the Notification entity for database mapping
import { UserModule } from '../user/user.module'; // Import UserModule for user-related dependencies
import { TaskModule } from '../task/task.module'; // Import TaskModule for task-related dependencies

/**
 * NotificationModule class defining the notification feature module.
 * Configures the module by providing the NotificationService, registering the NotificationController,
 * setting up TypeORM for the Notification entity, and importing related modules (UserModule, TaskModule).
 */
@Module({
  imports: [
    // Configure TypeORM to use the Notification entity for database operations
    TypeOrmModule.forFeature([Notification]),

    // Use forwardRef to handle circular dependency with TaskModule
    forwardRef(() => TaskModule),

    // Import UserModule to access user-related services and entities
    UserModule,
  ],
  providers: [
    NotificationService, // Provide the NotificationService for dependency injection
  ],
  controllers: [
    NotificationController, // Register the NotificationController to handle HTTP requests
  ],
  exports: [
    NotificationService, // Export the NotificationService for use in other modules
  ],
})
export class NotificationModule {}