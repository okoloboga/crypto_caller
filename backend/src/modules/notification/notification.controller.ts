import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { NotificationService } from './notification.service';

@Controller('notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('call')
  async makeCall(@Body('phoneNumber') phoneNumber: string, @Body('taskId') taskId: number) {
    try {
      await this.notificationService.makeCall(phoneNumber, taskId);
      return { message: `Call initiated to ${phoneNumber} for task ${taskId}` };
    } catch (error) {
      console.error(`Call error: ${error.message}`);
      throw new HttpException(
        { message: 'Failed to make call', details: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
