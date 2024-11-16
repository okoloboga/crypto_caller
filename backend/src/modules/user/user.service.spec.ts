import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './user.entity';
import { Repository } from 'typeorm';

describe('UserService', () => {
  let userService: UserService;
  let userRepositoryMock: Partial<Repository<User>>;

  beforeEach(async () => {
    // Замокируем все методы репозитория
    userRepositoryMock = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: userRepositoryMock, // Передаём замокированный объект
        },
      ],
    }).compile();

    userService = module.get<UserService>(UserService);
  });

  it('should register a new user', async () => {
    const telegramId = '12345';
    const mockUser = new User();
    mockUser.telegramId = telegramId;

    (userRepositoryMock.findOne as jest.Mock).mockResolvedValue(null); // Пользователь ещё не зарегистрирован
    (userRepositoryMock.create as jest.Mock).mockReturnValue(mockUser);
    (userRepositoryMock.save as jest.Mock).mockResolvedValue(mockUser);

    const result = await userService.registerUser(telegramId);

    expect(userRepositoryMock.findOne).toHaveBeenCalledWith({ where: { telegramId } });
    expect(userRepositoryMock.create).toHaveBeenCalledWith({ telegramId });
    expect(userRepositoryMock.save).toHaveBeenCalledWith(mockUser);
    expect(result).toEqual(mockUser);
  });

  it('should not register a user if they already exist', async () => {
    const telegramId = '12345';
    const mockUser = new User();
    mockUser.telegramId = telegramId;

    (userRepositoryMock.findOne as jest.Mock).mockResolvedValue(mockUser); // Пользователь уже зарегистрирован

    const result = await userService.registerUser(telegramId);

    expect(userRepositoryMock.findOne).toHaveBeenCalledWith({ where: { telegramId } });
    expect(userRepositoryMock.create).not.toHaveBeenCalled(); // Проверяем, что create не вызывался
    expect(userRepositoryMock.save).not.toHaveBeenCalled(); // Проверяем, что save не вызывался
    expect(result).toEqual(mockUser);
  });

  it('should find a user by id', async () => {
    const mockUser = new User();
    mockUser.id = 1;

    (userRepositoryMock.findOne as jest.Mock).mockResolvedValue(mockUser);

    const result = await userService.findOne(1);

    expect(userRepositoryMock.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(result).toEqual(mockUser);
  });

  it('should update subscription status', async () => {
    const mockUser = new User();
    mockUser.id = 1;
    mockUser.subscriptionStatus = 'inactive';

    (userRepositoryMock.findOne as jest.Mock).mockResolvedValue(mockUser);
    (userRepositoryMock.save as jest.Mock).mockResolvedValue(mockUser);

    const result = await userService.updateSubscriptionStatus(1, 'active');

    expect(userRepositoryMock.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(userRepositoryMock.save).toHaveBeenCalledWith(mockUser);
    expect(mockUser.subscriptionStatus).toBe('active');
    expect(result).toEqual(mockUser);
  });

  it('should find all active subscribed users', async () => {
    const mockUsers = [
      { id: 1, subscriptionStatus: 'active' },
      { id: 2, subscriptionStatus: 'active' },
    ] as User[];

    (userRepositoryMock.find as jest.Mock).mockResolvedValue(mockUsers);

    const result = await userService.findActiveSubscribedUsers();

    expect(userRepositoryMock.find).toHaveBeenCalledWith({ where: { subscriptionStatus: 'active' } });
    expect(result).toEqual(mockUsers);
  });
});
