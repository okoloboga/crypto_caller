import { Test, TestingModule } from '@nestjs/testing';
import { PriceMonitorJob } from './price-monitor.processor';
import { TaskService } from '../modules/task/task.service';

describe('PriceMonitorJob', () => {
  let priceMonitorJob: PriceMonitorJob;
  let taskServiceMock: Partial<TaskService>;

  beforeEach(async () => {
    taskServiceMock = {
      checkTasksForPriceTriggers: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PriceMonitorJob,
        { provide: TaskService, useValue: taskServiceMock },
      ],
    }).compile();

    priceMonitorJob = module.get<PriceMonitorJob>(PriceMonitorJob);
  });

  it('should call checkTasksForPriceTriggers', async () => {
    await priceMonitorJob.monitorPrice({} as any);

    expect(taskServiceMock.checkTasksForPriceTriggers).toHaveBeenCalled();
  });

  it('should log error if checkTasksForPriceTriggers throws', async () => {
    jest.spyOn(taskServiceMock, 'checkTasksForPriceTriggers').mockRejectedValue(new Error('Test error'));
    const consoleErrorMock = jest.spyOn(console, 'error').mockImplementation(() => {});

    await priceMonitorJob.monitorPrice({} as any);

    expect(consoleErrorMock).toHaveBeenCalledWith(
      'Error during price monitoring:',
      expect.any(Error),
    );
    consoleErrorMock.mockRestore();
  });
});
