import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { TaskService } from '../task/task.service';

@Processor('price-monitor')
export class PriceMonitorJob {
  constructor(private readonly taskService: TaskService) {}

  @Process()
  async monitorPrice(job: Job): Promise<void> {
    try {
      console.log('Starting price check...');
      await this.taskService.checkTasksForPriceTriggers();
      console.log('Price check completed successfully');
    } catch (error) {
      console.error('Error during price monitoring:', error);
    }
  }
}
