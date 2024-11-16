import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { TaskService } from '../modules/task/task.service';

@Processor('price-monitor')  // Указываем имя очереди
export class PriceMonitorJob {
  constructor(private readonly taskService: TaskService) {}

  @Process()
  async monitorPrice(job: Job): Promise<void> {
    try {
      await this.taskService.checkTasksForPriceTriggers();
      console.log('Price check completed');
    } catch (error) {
      console.error('Error during price monitoring:', error);
    }
  }
  
}
