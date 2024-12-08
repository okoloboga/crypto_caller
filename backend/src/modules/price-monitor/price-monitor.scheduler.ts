import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class PriceMonitorScheduler {
  constructor(@InjectQueue('price-monitor') private priceMonitorQueue: Queue) {}

  async schedulePriceMonitor() {
    await this.priceMonitorQueue.add(
      {},
      {
        repeat: {
          cron: '*/59 * * * * *',
        },
      }
    );
    console.log('Scheduled price monitor every 59 seconds');
  }
}
