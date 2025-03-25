/**
 * Scheduler for price monitoring jobs in the RUBLE Farming App backend.
 * This service schedules recurring price monitoring jobs using a Bull queue.
 * It is part of the PriceMonitorModule and adds a job to the 'price-monitor' queue
 * to run every 59 seconds.
 */

import { Injectable } from '@nestjs/common'; // Import Injectable decorator for NestJS service
import { InjectQueue } from '@nestjs/bull'; // Import InjectQueue to inject a Bull queue
import { Queue } from 'bull'; // Import Queue type for Bull queue

/**
 * PriceMonitorScheduler class responsible for scheduling price monitoring jobs.
 * Adds a recurring job to the 'price-monitor' queue to run every 59 seconds.
 */
@Injectable()
export class PriceMonitorScheduler {
  /**
   * Constructor to inject dependencies.
   * @param priceMonitorQueue - The Bull queue for price monitoring jobs.
   */
  constructor(@InjectQueue('price-monitor') private priceMonitorQueue: Queue) {}

  /**
   * Schedule a recurring price monitoring job.
   * Adds a job to the 'price-monitor' queue that runs every 59 seconds.
   */
  async schedulePriceMonitor() {
    await this.priceMonitorQueue.add(
      {}, // No job data is passed (empty object)
      {
        repeat: {
          cron: '*/59 * * * * *', // Run every 59 seconds
        },
      },
    );
    // Log the scheduling action
    console.log('Scheduled price monitor every 59 seconds');
  }
}