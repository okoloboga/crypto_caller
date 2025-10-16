/**
 * Feature module for user-related functionality in the RUBLE Farming App backend.
 * This module encapsulates the logic for managing users, including their subscriptions,
 * points, and associated data (e.g., tasks, notifications). It provides the UserService
 * and UserController, integrates with the User entity for database operations using TypeORM,
 * and exports the TypeORM configuration for use in other modules.
 */

import { Module } from '@nestjs/common'; // Import Module decorator for defining NestJS modules
import { TypeOrmModule } from '@nestjs/typeorm'; // Import TypeOrmModule for database integration
import { UserController } from './user.controller'; // Import the UserController for HTTP endpoints
import { UserService } from './user.service'; // Import the UserService for business logic
import { User } from './user.entity'; // Import the User entity for database mapping
import { RelayerModule } from '../relayer/relayer.module'; // Import RelayerModule for relayer integration

/**
 * UserModule class defining the user feature module.
 * Configures the module by providing the UserService, registering the UserController,
 * setting up TypeORM for the User entity, and exporting the TypeORM configuration
 * for use in other modules (e.g., TaskModule, NotificationModule).
 */
@Module({
  imports: [
    // Configure TypeORM to use the User entity for database operations
    TypeOrmModule.forFeature([User]),
    // Import RelayerModule for relayer integration
    RelayerModule,
  ],
  controllers: [
    UserController, // Register the UserController to handle HTTP requests
  ],
  providers: [
    UserService, // Provide the UserService for dependency injection
  ],
  exports: [
    // Export the TypeORM configuration for the User entity so other modules can access the User repository
    TypeOrmModule.forFeature([User]),
  ],
})
export class UserModule {}