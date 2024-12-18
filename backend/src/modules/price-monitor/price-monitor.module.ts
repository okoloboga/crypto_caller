import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { PriceMonitorScheduler } from './price-monitor.scheduler';
import { PriceMonitorJob } from './price-monitor.processor';
import { TaskModule } from '../task/task.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'price-monitor',  // Указываем имя очереди
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: true,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 }, // задержка перед повторной попыткой
      },
    }),
    TaskModule,
  ],
  providers: [PriceMonitorScheduler, PriceMonitorJob],
})
export class PriceMonitorModule {
  constructor(private readonly priceMonitorScheduler: PriceMonitorScheduler) {}

  onModuleInit() {
    this.priceMonitorScheduler.schedulePriceMonitor();
  }
}
