import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
// Redis will be used directly with ioredis
import { ScheduleModule } from "@nestjs/schedule";
import { EventEmitterModule } from "@nestjs/event-emitter";

import { TonModule } from "./modules/ton/ton.module";
import { SwapModule } from "./modules/swap/swap.module";
import { BurnModule } from "./modules/burn/burn.module";
import { RedisModule } from "./modules/redis/redis.module";
import { HttpModule } from "@nestjs/axios";
import { MonitoringModule } from "./modules/monitoring/monitoring.module";
import { RelayerService } from "./services/relayer.service";
import { RelayerController } from "./controllers/relayer.controller";
import { BackendNotificationService } from "./services/backend-notification.service";
import { TransactionEntity } from "./entities/transaction.entity";
import { getRelayerConfig } from "./config/relayer.config";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.local", ".env"],
      load: [getRelayerConfig],
    }),
    TypeOrmModule.forRoot({
      type: "postgres",
      host: process.env.POSTGRES_HOST || "localhost",
      port: parseInt(process.env.POSTGRES_PORT || "5432"),
      username: process.env.POSTGRES_USER || "postgres",
      password: process.env.POSTGRES_PASSWORD || "password",
      database: process.env.POSTGRES_DB || "crypto_caller",
      entities: [TransactionEntity],
      synchronize: process.env.NODE_ENV !== "production",
      logging: false, // Disable SQL query logging to reduce log noise
    }),
    HttpModule,
    RedisModule,
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    TonModule,
    SwapModule,
    BurnModule,
    MonitoringModule,
    TypeOrmModule.forFeature([TransactionEntity]),
  ],
  controllers: [RelayerController],
  providers: [RelayerService, BackendNotificationService],
})
export class AppModule {}
