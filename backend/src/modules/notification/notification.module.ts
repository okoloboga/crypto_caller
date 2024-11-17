import { Module, forwardRef } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './notification.entity';
import { UserModule } from '../user/user.module';
import { TaskModule } from '../task/task.module';  // Импортируем TaskModule

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification]),
    forwardRef(() => TaskModule),
    UserModule,
  ],
  providers: [NotificationService],
  controllers: [NotificationController],
  exports: [NotificationService],
})
export class NotificationModule {}
