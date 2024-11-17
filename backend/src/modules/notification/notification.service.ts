import { Injectable } from '@nestjs/common';
import { Twilio } from 'twilio';
import { Notification } from './notification.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class NotificationService {
  private twilioClient: Twilio;

  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
  ) {
    this.twilioClient = new Twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN,
    );
  }

  async makeCall(phoneNumber: string, taskId: number): Promise<void> {
    const MAX_RETRIES = 3;
    let attempt = 0;

    while (attempt < MAX_RETRIES) {
      try {
        await this.twilioClient.calls.create({
          to: phoneNumber,
          from: process.env.TWILIO_PHONE_NUMBER,
          url: 'http://demo.twilio.com/docs/voice.xml',
        });

        const notification = new Notification(phoneNumber, 'initiated', null, null);
        await this.notificationRepository.save(notification);

        console.log(`Call initiated to ${phoneNumber} for task ${taskId}`);
        return; // Успешный звонок — выходим из цикла
      } catch (error) {
        attempt++;
        console.error(`Attempt ${attempt} failed: ${error.message}`);
        if (attempt >= MAX_RETRIES) {
          console.error(`Failed to make call after ${MAX_RETRIES} attempts`);
          throw new Error('Failed to make call');
        }
        // Ждем перед следующим повтором
        await this.delay(2000); // 2 секунды ожидания между попытками
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
