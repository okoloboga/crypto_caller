import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Subscription } from './subscription.entity';
import { SubscriptionService } from './subscription/subscription.service';
import { SubscriptionController } from './subscription/subscription.controller';
import { UserModule } from '../user/user.module';  // Импортируем UserModule для работы с пользователями

@Module({
  imports: [TypeOrmModule.forFeature([Subscription]), UserModule],
  providers: [SubscriptionService],
  controllers: [SubscriptionController],
})
export class SubscriptionModule {}