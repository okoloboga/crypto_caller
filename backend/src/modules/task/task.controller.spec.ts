import { Test, TestingModule } from '@nestjs/testing';
import { TaskController } from './task.controller';
import { TaskService } from './task.service';
import { Task } from './task.entity';

describe('TaskController (Integration)', () => {
  let taskController: TaskController;
  let taskServiceMock: Partial<TaskService>;

  beforeEach(async () => {
    taskServiceMock = {
      createTask: jest.fn(),
      updateTask: jest.fn(),
      deleteTask: jest.fn(),
      getTasksByUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TaskController],
      providers: [{ provide: TaskService, useValue: taskServiceMock }],
    }).compile();

    taskController = module.get<TaskController>(TaskController);
  });

  it('should create a task', async () => {
    const mockTask: Task = {
      id: 1,
      pair: 'BTC/USDT',
      targetPrice: 50000,
      isActive: true,
      isPriceAbove: false,
      user: { id: 1, telegramId: '123456', subscriptionStatus: 'active' } as any,
      createdAt: new Date(),
      updatedAt: new Date(),
      notifications: [],
    };

    jest.spyOn(taskServiceMock, 'createTask').mockResolvedValue(mockTask);

    const result = await taskController.createTask(1, 'BTC/USDT', 50000);

    expect(taskServiceMock.createTask).toHaveBeenCalledWith(
      { id: 1 } as any,
      'BTC/USDT',
      50000,
    );
    expect(result).toEqual(mockTask);
  });

  it('should update a task', async () => {
    const mockUpdatedTask: Partial<Task> = {
      id: 1,
      targetPrice: 60000,
    };

    jest.spyOn(taskServiceMock, 'updateTask').mockResolvedValue(mockUpdatedTask as Task);

    const result = await taskController.updateTask(1, { targetPrice: 60000 });

    expect(taskServiceMock.updateTask).toHaveBeenCalledWith(1, { targetPrice: 60000 });
    expect(result).toEqual(mockUpdatedTask);
  });

  it('should delete a task', async () => {
    jest.spyOn(taskServiceMock, 'deleteTask').mockResolvedValue();

    await taskController.deleteTask(1);

    expect(taskServiceMock.deleteTask).toHaveBeenCalledWith(1);
  });

  it('should get tasks by user', async () => {
    const mockTasks: Task[] = [
      {
        id: 1,
        pair: 'BTC/USDT',
        targetPrice: 50000,
        isActive: true,
        isPriceAbove: false,
        user: { id: 1 } as any,
        createdAt: new Date(),
        updatedAt: new Date(),
        notifications: [],
      },
      {
        id: 2,
        pair: 'ETH/USDT',
        targetPrice: 3000,
        isActive: true,
        isPriceAbove: true,
        user: { id: 1 } as any,
        createdAt: new Date(),
        updatedAt: new Date(),
        notifications: [],
      },
    ];

    jest.spyOn(taskServiceMock, 'getTasksByUser').mockResolvedValue(mockTasks);

    const result = await taskController.getTasksByUser(1);

    expect(taskServiceMock.getTasksByUser).toHaveBeenCalledWith(1);
    expect(result).toEqual(mockTasks);
  });
});
