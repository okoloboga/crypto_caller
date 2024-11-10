// src/modules/notification/notification.service.ts

import { Injectable } from '@nestjs/common';
import { Twilio } from 'twilio';
import { Notification } from '../notification.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UserService } from '../../user/user/user.service';
import { TaskService } from '../../task/task/task.service';

@Injectable()
export class NotificationService {
  private twilioClient: Twilio;

  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    private userService: UserService,
    private taskService: TaskService,
  ) {
    this.twilioClient = new Twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN,
    );
  }

  async makeCall(phoneNumber: string, taskId: number): Promise<void> {
    try {
      await this.twilioClient.calls.create({
        to: phoneNumber,
        from: process.env.TWILIO_PHONE_NUMBER,
        url: 'http://demo.twilio.com/docs/voice.xml',
      });

      const notification = new Notification(phoneNumber, 'initiated', null, null);
      await this.notificationRepository.save(notification);

      console.log(`Call initiated to ${phoneNumber} for task ${taskId}`);
    } catch (error) {
      console.error(`Error making call: ${error.message}`);
      throw new Error('Failed to make call');
    }
  }
}
