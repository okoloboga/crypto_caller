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
      { name: 'price-monitor' }, // Очередь для мониторинга цен
      { name: 'points-accumulation' }, // Очередь для начисления баллов
    ),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'postgres',
      port: 5432,
      username: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.POSTGRES_DB,
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true,
    }),
  ],
})
export class AppModule {}
