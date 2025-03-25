/**
 * Feature module for price monitoring functionality in the RUBLE Farming App backend.
 * This module manages the scheduling and processing of price monitoring jobs using Bull queues.
 * It integrates with the TaskModule to access task-related data and functionality.
 * The module schedules price monitoring jobs on initialization.
 */

import { Module } from '@nestjs/common'; // Import Module decorator for defining NestJS modules
import { BullModule } from '@nestjs/bull'; // Import BullModule for queue management
import { PriceMonitorScheduler } from './price-monitor.scheduler'; // Import the scheduler for price monitoring jobs
import { PriceMonitorJob } from './price-monitor.processor'; // Import the processor for handling price monitoring jobs
import { TaskModule } from '../task/task.module'; // Import TaskModule for task-related dependencies

/**
 * PriceMonitorModule class defining the price monitoring feature module.
 * Configures the module by setting up a Bull queue for price monitoring, importing the TaskModule,
 * and providing the PriceMonitorScheduler and PriceMonitorJob. It also schedules price monitoring
 * jobs on module initialization.
 */
@Module({
  imports: [
    // Configure the Bull queue for price monitoring
    BullModule.registerQueue({
      name: 'price-monitor', // Name of the queue for price monitoring jobs
      defaultJobOptions: {
        removeOnComplete: true, // Remove jobs from the queue after successful completion
        removeOnFail: true, // Remove jobs from the queue after failure
        attempts: 3, // Retry failed jobs up to 3 times
        backoff: { type: 'exponential', delay: 5000 }, // Exponential backoff with 5-second initial delay
      },
    }),

    // Import TaskModule to access task-related services and entities
    TaskModule,
  ],
  providers: [
    PriceMonitorScheduler, // Provide the scheduler for scheduling price monitoring jobs
    PriceMonitorJob, // Provide the processor for handling price monitoring jobs
  ],
})
export class PriceMonitorModule {
  /**
   * Constructor to inject dependencies.
   * @param priceMonitorScheduler - The scheduler for price monitoring jobs.
   */
  constructor(private readonly priceMonitorScheduler: PriceMonitorScheduler) {}

  /**
   * Lifecycle hook called after the module is initialized.
   * Schedules price monitoring jobs using the PriceMonitorScheduler.
   */
  onModuleInit() {
    this.priceMonitorScheduler.schedulePriceMonitor();
  }
}