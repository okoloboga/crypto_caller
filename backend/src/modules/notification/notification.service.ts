/**
 * Service for handling notification-related operations in the RUBLE Farming App backend.
 * This service provides functionality for initiating phone calls using the Twilio API
 * and saving notification records to the database. It is part of the NotificationModule.
 */

import { Injectable } from '@nestjs/common'; // Import Injectable decorator from NestJS
import { Twilio } from 'twilio'; // Import Twilio for making phone calls
import { Notification } from './notification.entity'; // Import the Notification entity for database mapping
import { Repository } from 'typeorm'; // Import Repository for database operations
import { InjectRepository } from '@nestjs/typeorm'; // Import InjectRepository for repository injection

/**
 * NotificationService class providing business logic for initiating phone calls and saving notifications.
 * Uses the Twilio API to make calls and TypeORM to persist notification records.
 */
@Injectable()
export class NotificationService {
  // Twilio client for making phone calls
  private twilioClient: Twilio;

  /**
   * Constructor to initialize the Twilio client and inject dependencies.
   * @param notificationRepository - The repository for Notification entities.
   */
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
  ) {
    // Initialize the Twilio client with account SID and auth token from environment variables
    this.twilioClient = new Twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN,
    );
  }

  /**
   * Initiate a phone call to the specified phone number for a task.
   * Retries the call up to 3 times if it fails, with a delay between attempts.
   * Saves a notification record to the database upon successful initiation.
   * @param phoneNumber - The phone number to call.
   * @param taskId - The ID of the task associated with the notification.
   * @throws Error if the call fails after the maximum number of retries.
   */
  async makeCall(phoneNumber: string, taskId: number): Promise<void> {
    const MAX_RETRIES = 3; // Maximum number of retry attempts
    let attempt = 0; // Current attempt counter

    while (attempt < MAX_RETRIES) {
      try {
        // Attempt to initiate the phone call using Twilio
        await this.twilioClient.calls.create({
          to: phoneNumber, // Recipient's phone number
          from: process.env.TWILIO_PHONE_NUMBER, // Twilio phone number from environment variable
          url: 'http://demo.twilio.com/docs/voice.xml', // URL for the voice response (TwiML)
        });

        // Create and save a notification record with status 'initiated'
        const notification = new Notification(phoneNumber, 'initiated', null, null);
        await this.notificationRepository.save(notification);

        // Log the successful call initiation
        console.log(`Call initiated to ${phoneNumber} for task ${taskId}`);
        return; // Exit the loop on success
      } catch (error) {
        attempt++;
        // Log the failed attempt
        console.error(`Attempt ${attempt} failed: ${error.message}`);
        if (attempt >= MAX_RETRIES) {
          // Log and throw an error if all retries fail
          console.error(`Failed to make call after ${MAX_RETRIES} attempts`);
          throw new Error('Failed to make call');
        }
        // Wait before the next retry
        await this.delay(2000); // 2-second delay between attempts
      }
    }
  }

  /**
   * Create a delay for the specified number of milliseconds.
   * @param ms - The number of milliseconds to delay.
   * @returns A promise that resolves after the specified delay.
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}