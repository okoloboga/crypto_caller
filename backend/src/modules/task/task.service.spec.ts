import { Test, TestingModule } from '@nestjs/testing';
import { TaskService } from './task.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Task } from './task.entity';
import { User } from '../user/user.entity';
import { Repository } from 'typeorm';
import { NotificationService } from '../notification/notification.service';
import { OkxApiService } from '../../shared/okx-api.service';
import { UserService } from '../user/user.service';

describe('TaskService', () => {
  let taskService: TaskService;
  let taskRepositoryMock: Partial<Repository<Task>>;
  let notificationServiceMock: Partial<NotificationService>;
  let okxApiServiceMock: Partial<OkxApiService>;
  let userServiceMock: Partial<UserService>;

  beforeEach(async () => {
    taskRepositoryMock = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      remove: jest.fn(),
    };

    notificationServiceMock = {
      makeCall: jest.fn(),
    };

    okxApiServiceMock = {
      getCurrentPrice: jest.fn(),
    };

    userServiceMock = {
      findOne: jest.fn(), // Пример мока метода, если потребуется
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskService,
        { provide: getRepositoryToken(Task), useValue: taskRepositoryMock },
        { provide: NotificationService, useValue: notificationServiceMock },
        { provide: OkxApiService, useValue: okxApiServiceMock },
        { provide: UserService, useValue: userServiceMock }, // Добавляем UserService мок
      ],
    }).compile();

    taskService = module.get<TaskService>(TaskService);
  });

  it('should create a new task', async () => {
    const mockTask = new Task();
    mockTask.id = 1;
    mockTask.pair = 'BTC/USDT';
    mockTask.targetPrice = 65000;

    const mockUser = new User();
    mockUser.id = 1;

    jest.spyOn(taskRepositoryMock, 'create').mockReturnValue(mockTask);
    jest.spyOn(taskRepositoryMock, 'save').mockResolvedValue(mockTask);

    const result = await taskService.createTask(mockUser, 'BTC/USDT', 65000);

    expect(taskRepositoryMock.create).toHaveBeenCalledWith({
      user: mockUser,
      pair: 'BTC/USDT',
      targetPrice: 65000,
    });
    expect(taskRepositoryMock.save).toHaveBeenCalledWith(mockTask);
    expect(result).toEqual(mockTask);
  });

  it('should get tasks by user ID', async () => {
    const mockTasks = [
      { id: 1, pair: 'BTC/USDT', targetPrice: 65000 },
      { id: 2, pair: 'ETH/USDT', targetPrice: 2000 },
    ] as Task[];

    jest.spyOn(taskRepositoryMock, 'find').mockResolvedValue(mockTasks);

    const result = await taskService.getTasksByUser(1);

    expect(taskRepositoryMock.find).toHaveBeenCalledWith({ where: { user: { id: 1 } } });
    expect(result).toEqual(mockTasks);
  });

  it('should delete a task', async () => {
    jest.spyOn(taskRepositoryMock, 'delete').mockResolvedValue(undefined);

    await taskService.deleteTask(1);

    expect(taskRepositoryMock.delete).toHaveBeenCalledWith(1);
  });
});
