import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from './task.entity';
import { TaskService } from './task.service';
import { TaskController } from './task.controller';
import { SharedModule } from '../../shared/shared.module';
import { NotificationModule } from '../notification/notification.module';  // Импортируем NotificationModule

@Module({
  imports: [
    TypeOrmModule.forFeature([Task]),
    SharedModule,
    forwardRef(() => NotificationModule),  // Используем forwardRef для отсроченного импорта
  ],
  providers: [TaskService],
  controllers: [TaskController],
  exports: [TaskService],
})
export class TaskModule {}
