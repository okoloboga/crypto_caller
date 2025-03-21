import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from './modules/user/user.module';
import { TaskModule } from './modules/task/task.module';
import { NotificationModule } from './modules/notification/notification.module';
import { ChallengeModule } from './modules/challenge/challenge.module';
import { AppController } from './app.controller';
import { BullModule } from '@nestjs/bull';
import { PriceMonitorModule } from './modules/price-monitor/price-monitor.module';
import { TicketModule } from './modules/tickets/tickets.module';
import { TonModule } from './modules/ton/ton.module';
import { WithdrawalController } from './modules/ton/withdrawal.controller';

@Module({
  imports: [
    ChallengeModule,
    TicketModule,
    UserModule, 
    TaskModule, 
    TonModule,
    NotificationModule,
    PriceMonitorModule, 
    BullModule.forRoot({
      redis: {
        host: 'redis',
        port: 6379,
        password: process.env.REDIS_PASSWORD,
        retryStrategy: (times) => {
          const delay = Math.min(times * 1000, 30000); 
          console.log(`Retrying Redis connection after ${delay}ms`);
          return delay;
        },
      },
    }),
    BullModule.registerQueue(
      { name: 'price-monitor' },
    ),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'postgres',
      port: 5432,
      username: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.POSTGRES_DB,
      entities: [__dirname + '/modules/**/*.entity{.ts,.js}'],
      synchronize: true
    }),
  ],
  controllers: [AppController, WithdrawalController],
})
export class AppModule {}
