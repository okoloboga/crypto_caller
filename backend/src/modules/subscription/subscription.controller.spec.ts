import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';
import { UserService } from '../user/user.service';
import { User } from '../user/user.entity';

function createMockUser(overrides: Partial<User> = {}): User {
    return {
      id: 1,
      telegramId: '123456',
      phoneNumber: '+1234567890',
      subscriptionStatus: 'active',
      points: 0,
      lastPointsCollectedAt: new Date(),
      tasks: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      notifications: [],
      ...overrides,
    };
  }
  

describe('SubscriptionController (Integration)', () => {
  let subscriptionController: SubscriptionController;
  let subscriptionServiceMock: Partial<SubscriptionService>;
  let userServiceMock: Partial<UserService>;

  beforeEach(async () => {
    subscriptionServiceMock = {
      checkSubscription: jest.fn(),
      createSubscription: jest.fn(),
      cancelSubscription: jest.fn(),
    };

    userServiceMock = {
      findUserByTelegramId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubscriptionController],
      providers: [
        { provide: SubscriptionService, useValue: subscriptionServiceMock },
        { provide: UserService, useValue: userServiceMock },
      ],
    }).compile();

    subscriptionController = module.get<SubscriptionController>(SubscriptionController);
  });

  it('should check subscription status', async () => {
    const mockResponse = { isActive: true, phoneNumber: '+1234567890' };
    jest.spyOn(subscriptionServiceMock, 'checkSubscription').mockResolvedValue(mockResponse);

    const req = { user: { telegramId: '123456' } };

    const result = await subscriptionController.checkSubscription(req);

    expect(subscriptionServiceMock.checkSubscription).toHaveBeenCalledWith('123456');
    expect(result).toEqual(mockResponse);
  });

  it('should create a subscription', async () => {
    const mockUser = createMockUser({ subscriptionStatus: 'active' });
    jest.spyOn(subscriptionServiceMock, 'createSubscription').mockResolvedValue(mockUser);

    const req = { user: { telegramId: '123456' } };

    const result = await subscriptionController.createSubscription(req, '+1234567890');

    expect(subscriptionServiceMock.createSubscription).toHaveBeenCalledWith('123456', '+1234567890');
    expect(result).toEqual(mockUser);
  });

  it('should cancel a subscription', async () => {
    const mockUser = createMockUser({ subscriptionStatus: 'inactive' }); // Подписка должна быть "inactive"
    jest.spyOn(subscriptionServiceMock, 'cancelSubscription').mockResolvedValue(mockUser); // Мокаем cancelSubscription
  
    const req = { user: { telegramId: '123456' } };
  
    const result = await subscriptionController.cancelSubscription(req);
  
    expect(subscriptionServiceMock.cancelSubscription).toHaveBeenCalledWith('123456');
    expect(result).toEqual(mockUser); // Проверяем, что результат соответствует мокированному пользователю
  });
  
});
