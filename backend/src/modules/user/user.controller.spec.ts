import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';

describe('UserController (Integration)', () => {
  let userController: UserController;
  let userServiceMock: Partial<UserService>;

  beforeEach(async () => {
    userServiceMock = {
      registerUser: jest.fn(),
      updateSubscriptionStatus: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [{ provide: UserService, useValue: userServiceMock }],
    }).compile();

    userController = module.get<UserController>(UserController);
  });

  it('should register a new user', async () => {
    const mockUser = {
      id: 1,
      telegramId: '123456',
      phoneNumber: '+1234567890',
      subscriptionStatus: 'inactive',
    };

    jest.spyOn(userServiceMock, 'registerUser').mockResolvedValue(mockUser as any);

    const result = await userController.registerUser('123456', '+1234567890');

    expect(userServiceMock.registerUser).toHaveBeenCalledWith('123456', '+1234567890');
    expect(result).toEqual(mockUser);
  });

  it('should update subscription status for a user', async () => {
    const mockUser = {
      id: 1,
      telegramId: '123456',
      subscriptionStatus: 'active',
    };

    jest.spyOn(userServiceMock, 'updateSubscriptionStatus').mockResolvedValue(mockUser as any);

    const result = await userController.updateSubscriptionStatus(1, 'active');

    expect(userServiceMock.updateSubscriptionStatus).toHaveBeenCalledWith(1, 'active');
    expect(result).toEqual(mockUser);
  });
});
