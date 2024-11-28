import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from './modules/user/user.module';
import { TaskModule } from './modules/task/task.module';
import { NotificationModule } from './modules/notification/notification.module';
import { ChallengeModule } from './modules/challenge/challenge.module';
import { AppController } from './app.controller';
import { BullModule } from '@nestjs/bull';
import { PriceMonitorModule } from './modules/price-monitor/price-monitor.module';

@Module({
  imports: [
    ChallengeModule,
    UserModule, 
    TaskModule, 
    NotificationModule,
    PriceMonitorModule, 
    BullModule.forRoot({
      redis: {
        host: 'redis',
        port: 6379,
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
  controllers: [AppController],
})
export class AppModule {}
