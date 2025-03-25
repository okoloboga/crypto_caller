/**
 * Bull queue processor for price monitoring jobs in the RUBLE Farming App backend.
 * This processor handles jobs in the 'price-monitor' queue, checking tasks for price triggers
 * by delegating to the TaskService. It is part of the PriceMonitorModule.
 */

import { Processor, Process } from '@nestjs/bull'; // Import Processor and Process decorators for Bull queue handling
import { Job } from 'bull'; // Import Job type for Bull queue jobs
import { TaskService } from '../task/task.service'; // Import TaskService for task-related operations

/**
 * PriceMonitorJob class defining the processor for price monitoring jobs.
 * Processes jobs in the 'price-monitor' queue by checking tasks for price triggers.
 */
@Processor('price-monitor') // Register this class as a processor for the 'price-monitor' queue
export class PriceMonitorJob {
  /**
   * Constructor to inject dependencies.
   * @param taskService - The service for task-related operations, used to check price triggers.
   */
  constructor(private readonly taskService: TaskService) {}

  /**
   * Process a price monitoring job.
   * Checks all tasks for price triggers using the TaskService.
   * @param job - The Bull job object containing job data.
   */
  @Process() // Mark this method as the default handler for jobs in the 'price-monitor' queue
  async monitorPrice(job: Job): Promise<void> {
    try {
      console.log('Starting price check...');
      // Delegate to TaskService to check all tasks for price triggers
      await this.taskService.checkTasksForPriceTriggers();
      console.log('Price check completed successfully');
    } catch (error) {
      // Log any errors that occur during price monitoring
      console.error('Error during price monitoring:', error);
    }
  }
}