import { Controller, Post, Body } from '@nestjs/common';
import { NotificationService } from './notification.service';

@Controller('notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('call')
  async makeCall(@Body('phoneNumber') phoneNumber: string, @Body('taskId') taskId: number) {
    await this.notificationService.makeCall(phoneNumber, taskId);
    return { message: `Call initiated to ${phoneNumber} for task ${taskId}` };
  }
}