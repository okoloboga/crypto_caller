/**
 * Controller for handling notification-related operations in the RUBLE Farming App backend.
 * This controller provides an endpoint for initiating phone calls as notifications for tasks.
 * It is part of the NotificationModule and uses the NotificationService to perform the actual call.
 */

import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common'; // Import NestJS core decorators and exceptions
import { NotificationService } from './notification.service'; // Import the NotificationService for business logic

/**
 * NotificationController class handling notification endpoints.
 * Routes are prefixed with '/api/notification' due to the global API prefix and controller path.
 */
@Controller('notification')
export class NotificationController {
  /**
   * Constructor to inject dependencies.
   * @param notificationService - The service handling notification logic, such as making phone calls.
   */
  constructor(private readonly notificationService: NotificationService) {}

  /**
   * Initiate a phone call for a specific task.
   * Endpoint: POST /api/notification/call
   * @param phoneNumber - The phone number to call.
   * @param taskId - The ID of the task associated with the notification.
   * @returns An object with a success message confirming the call initiation.
   * @throws HttpException if the call fails, with details about the error.
   */
  @Post('call')
  async makeCall(@Body('phoneNumber') phoneNumber: string, @Body('taskId') taskId: number) {
    try {
      // Call the service to initiate the phone call
      await this.notificationService.makeCall(phoneNumber, taskId);
      return { message: `Call initiated to ${phoneNumber} for task ${taskId}` };
    } catch (error) {
      // Log the error for debugging
      console.error(`Call error: ${error.message}`);
      
      // Throw an HTTP exception with error details
      throw new HttpException(
        { message: 'Failed to make call', details: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}