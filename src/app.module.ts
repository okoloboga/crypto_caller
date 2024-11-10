import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from './modules/user/user.module';
import { TaskModule } from './modules/task/task.module';
import { SubscriptionModule } from './modules/subscription/subscription.module';
import { PointsModule } from './modules/points/points.module';
import { NotificationModule } from './modules/notification/notification.module';
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    UserModule, 
    TaskModule, 
    SubscriptionModule, 
    PointsModule, 
    NotificationModule, 
    BullModule.forRoot({
      redis: {
        host: 'localhost',
        port: 6379,
      },
    }),
    BullModule.registerQueue(
      { name: 'price-monitor' },
      { name: 'points-accumulation' },
    ),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'caller',
      password: 'password',
      database: 'caller_db',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true,
    }),
  ]
})
export class AppModule {}
