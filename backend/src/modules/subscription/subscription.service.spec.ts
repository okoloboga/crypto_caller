import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionService } from './subscription.service';
import { UserService } from '../user/user.service';
import { User } from '../user/user.entity';

describe('SubscriptionService', () => {
  let subscriptionService: SubscriptionService;
  let userServiceMock: Partial<UserService>;

  function createMockUser(overrides: Partial<User> = {}): User {
    return {
      id: 1,
      telegramId: '12345',
      subscriptionStatus: 'inactive',
      phoneNumber: '+1234567890',
      points: 0,
      lastPointsCollectedAt: new Date(),
      tasks: [],
      notifications: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  beforeEach(async () => {
    userServiceMock = {
      findUserByTelegramId: jest.fn(),
      updateSubscriptionStatus: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionService,
        { provide: UserService, useValue: userServiceMock },
      ],
    }).compile();

    subscriptionService = module.get<SubscriptionService>(SubscriptionService);
  });

  it('should return active subscription status', async () => {
    const mockUser = createMockUser({ subscriptionStatus: 'active' });
    jest.spyOn(userServiceMock, 'findUserByTelegramId').mockResolvedValue(mockUser);

    const result = await subscriptionService.checkSubscription('12345');

    expect(result).toEqual({ isActive: true, phoneNumber: '+1234567890' });
    expect(userServiceMock.findUserByTelegramId).toHaveBeenCalledWith('12345');
  });

  it('should throw error if user not found', async () => {
    jest.spyOn(userServiceMock, 'findUserByTelegramId').mockResolvedValue(null);

    await expect(subscriptionService.checkSubscription('12345')).rejects.toThrow('User not found');
  });

  it('should create subscription', async () => {
    const mockUser = createMockUser();
    jest.spyOn(userServiceMock, 'findUserByTelegramId').mockResolvedValue(mockUser);

    await subscriptionService.createSubscription('12345', '+1234567890');
    expect(userServiceMock.updateSubscriptionStatus).toHaveBeenCalledWith(1, 'active');
  });

  it('should cancel subscription', async () => {
    const mockUser = createMockUser({ subscriptionStatus: 'active' });
    jest.spyOn(userServiceMock, 'findUserByTelegramId').mockResolvedValue(mockUser);

    await subscriptionService.cancelSubscription('12345');
    expect(userServiceMock.updateSubscriptionStatus).toHaveBeenCalledWith(1, 'inactive');
  });
});
