import { Module } from '@nestjs/common';
import { NotificationService } from './notification/notification.service';
import { NotificationController } from './notification/notification.controller';
import { UserService } from '../user/user/user.service';  // Импортируем UserService

@Module({
  providers: [NotificationService, UserService],
  controllers: [NotificationController],
})
export class NotificationModule {}
