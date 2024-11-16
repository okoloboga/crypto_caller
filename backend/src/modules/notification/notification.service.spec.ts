import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from './notification.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Notification } from './notification.entity';
import { Repository } from 'typeorm';
import { UserService } from '../user/user.service';
import { TaskService } from '../task/task.service';
import { Twilio } from 'twilio';

jest.mock('twilio'); // Мокируем библиотеку Twilio

describe('NotificationService', () => {
  let notificationService: NotificationService;
  let notificationRepositoryMock: Partial<Repository<Notification>>;
  let userServiceMock: Partial<UserService>;
  let taskServiceMock: Partial<TaskService>;
  let twilioClientMock: { calls: { create: jest.Mock } };
  let consoleErrorMock: jest.SpyInstance;

  beforeEach(async () => {
    notificationRepositoryMock = {
      save: jest.fn(),
    };

    userServiceMock = {
      findOne: jest.fn(),
    };

    taskServiceMock = {};

    twilioClientMock = {
      calls: {
        create: jest.fn(),
      },
    };

    (Twilio as jest.Mock).mockImplementation(() => twilioClientMock);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: getRepositoryToken(Notification), useValue: notificationRepositoryMock },
        { provide: UserService, useValue: userServiceMock },
        { provide: TaskService, useValue: taskServiceMock },
      ],
    }).compile();

    notificationService = module.get<NotificationService>(NotificationService);

    // Подавляем console.error
    consoleErrorMock = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Восстанавливаем console.error
    consoleErrorMock.mockRestore();
  });

  it('should retry on failure and eventually succeed', async () => {
    const phoneNumber = '+1234567890';
    const taskId = 1;

    twilioClientMock.calls.create
      .mockRejectedValueOnce(new Error('First attempt failed'))
      .mockRejectedValueOnce(new Error('Second attempt failed'))
      .mockResolvedValue({});

    (notificationRepositoryMock.save as jest.Mock).mockResolvedValue({});

    await notificationService.makeCall(phoneNumber, taskId);

    expect(twilioClientMock.calls.create).toHaveBeenCalledTimes(3); // 3 попытки
    expect(notificationRepositoryMock.save).toHaveBeenCalledWith(
      expect.objectContaining({
        phoneNumber,
        status: 'initiated',
      }),
    );
  });

  it('should throw an error after exceeding retries', async () => {
    const phoneNumber = '+1234567890';
    const taskId = 1;

    twilioClientMock.calls.create.mockRejectedValue(new Error('Call failed'));

    await expect(notificationService.makeCall(phoneNumber, taskId)).rejects.toThrow('Failed to make call');

    expect(twilioClientMock.calls.create).toHaveBeenCalledTimes(3); // 3 попытки
    expect(notificationRepositoryMock.save).not.toHaveBeenCalled(); // Запись не создаётся
  });
});

