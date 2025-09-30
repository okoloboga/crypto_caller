/**
 * Root module for the RUBLE Farming App backend.
 * This module defines the overall structure of the NestJS application by importing
 * feature modules, configuring TypeORM for PostgreSQL database connectivity,
 * and setting up Bull for queue management with Redis.
 */

import { Module } from '@nestjs/common'; // Import Module decorator for defining NestJS modules
import { TypeOrmModule } from '@nestjs/typeorm'; // Import TypeOrmModule for database integration
import { UserModule } from './modules/user/user.module'; // Import UserModule for user-related features
import { TaskModule } from './modules/task/task.module'; // Import TaskModule for task-related features
import { NotificationModule } from './modules/notification/notification.module'; // Import NotificationModule for notifications
import { ChallengeModule } from './modules/challenge/challenge.module'; // Import ChallengeModule for challenge generation
import { AppController } from './app.controller'; // Import AppController for basic app routes
import { BullModule } from '@nestjs/bull'; // Import BullModule for queue management
import { PriceMonitorModule } from './modules/price-monitor/price-monitor.module'; // Import PriceMonitorModule for price monitoring
import { SubscriptionModule } from './modules/subscription/subscription.module'; // Import module for subscription handling
import { TonModule } from './modules/ton/ton.module'; // Import TonModule for TON blockchain integration
import { WithdrawalController } from './modules/ton/withdrawal.controller'; // Import WithdrawalController for withdrawal endpoints

/**
 * AppModule class defining the root module of the application.
 * Configures the application by importing feature modules, setting up TypeORM for PostgreSQL,
 * and configuring Bull for queue management with Redis.
 */
@Module({
  imports: [
    // Feature modules for different parts of the application
    ChallengeModule, // Handles challenge generation for TON proof
    UserModule, // Manages user data and subscriptions
    TaskModule, // Manages tasks for price monitoring
    TonModule, // Handles TON blockchain interactions
    NotificationModule, // Manages notifications
    PriceMonitorModule, // Monitors cryptocurrency prices
    SubscriptionModule, // Handles subscription logic and verification

    // Configure Bull for queue management with Redis
    BullModule.forRoot({
      redis: {
        host: 'redis', // Redis host (container name in Docker)
        port: 6379, // Redis port
        password: process.env.REDIS_PASSWORD, // Redis password from environment variable
        retryStrategy: (times) => {
          // Retry strategy for Redis connection failures
          const delay = Math.min(times * 1000, 30000); // Exponential backoff, max 30 seconds
          console.log(`Retrying Redis connection after ${delay}ms`);
          return delay;
        },
      },
    }),

    // Register the price-monitor queue for Bull
    BullModule.registerQueue(
      { name: 'price-monitor' }, // Queue for price monitoring tasks
    ),

    // Configure TypeORM for PostgreSQL database connectivity
    TypeOrmModule.forRoot({
      type: 'postgres', // Database type
      host: 'postgres', // Database host (container name in Docker)
      port: 5432, // Database port
      username: process.env.POSTGRES_USER, // Database username from environment variable
      password: process.env.POSTGRES_PASSWORD, // Database password from environment variable
      database: process.env.POSTGRES_DB, // Database name from environment variable
      entities: [__dirname + '/modules/**/*.entity{.ts,.js}'], // Path to entity files
      synchronize: true, // Automatically synchronize database schema (use with caution in production)
    }),
  ],
  controllers: [
    AppController, // Basic controller for the app (e.g., health check)
    WithdrawalController, // Controller for handling withdrawal requests
  ],
})
export class AppModule {}