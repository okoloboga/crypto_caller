import { Test, TestingModule } from '@nestjs/testing';
import { PointsService } from './points.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Point } from './points.entity';
import { Repository } from 'typeorm';
import { UserService } from '../user/user.service';
import { User } from '../user/user.entity';

function createMockPoint(overrides: Partial<Point> = {}): Point {
    return {
      id: 1,
      points: 2,
      lastCollectedAt: new Date(),
      user: new User(),
      ...overrides, // Переопределяем свойства, если нужно
    };
  }

describe('PointsService', () => {
  let pointsService: PointsService;
  let pointsRepositoryMock: Partial<Repository<Point>>;
  let userServiceMock: Partial<UserService>;

  beforeEach(async () => {
    pointsRepositoryMock = {
      create: jest.fn(),
      save: jest.fn(),
    };

    userServiceMock = {
      findOne: jest.fn(),
      updatePoints: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PointsService,
        { provide: getRepositoryToken(Point), useValue: pointsRepositoryMock },
        { provide: UserService, useValue: userServiceMock },
      ],
    }).compile();

    pointsService = module.get<PointsService>(PointsService);
  });

  it('should accumulate points if 6 hours have passed', async () => {
    const mockUser = new User();
    mockUser.id = 1;
    mockUser.points = 10;
    mockUser.lastPointsCollectedAt = new Date(Date.now() - 7 * 60 * 60 * 1000); // 7 часов назад
  
    const mockPoint = createMockPoint();
  
    jest.spyOn(userServiceMock, 'findOne').mockResolvedValue(mockUser);
    jest.spyOn(pointsRepositoryMock, 'create').mockReturnValue(mockPoint);
    jest.spyOn(pointsRepositoryMock, 'save').mockResolvedValue(mockPoint);
  
    await pointsService.accumulatePoints(mockUser.id);
  
    expect(userServiceMock.findOne).toHaveBeenCalledWith(mockUser.id);
    expect(pointsRepositoryMock.create).toHaveBeenCalledWith({
      points: 2,
      lastCollectedAt: expect.any(Date),
      user: mockUser,
    });
    expect(pointsRepositoryMock.save).toHaveBeenCalled();
    expect(userServiceMock.updatePoints).toHaveBeenCalledWith(mockUser.id, 12, expect.any(Date));
  });
  

  it('should not accumulate points if less than 6 hours have passed', async () => {
    const mockUser = new User();
    mockUser.id = 1;
    mockUser.points = 10;
    mockUser.lastPointsCollectedAt = new Date(Date.now() - 5 * 60 * 60 * 1000); // 5 часов назад

    jest.spyOn(userServiceMock, 'findOne').mockResolvedValue(mockUser);

    await pointsService.accumulatePoints(mockUser.id);

    expect(userServiceMock.findOne).toHaveBeenCalledWith(mockUser.id);
    expect(pointsRepositoryMock.create).not.toHaveBeenCalled();
    expect(pointsRepositoryMock.save).not.toHaveBeenCalled();
    expect(userServiceMock.updatePoints).not.toHaveBeenCalled();
  });

  it('should return user points', async () => {
    const mockUser = new User();
    mockUser.id = 1;
    mockUser.points = 20;

    jest.spyOn(userServiceMock, 'findOne').mockResolvedValue(mockUser);

    const points = await pointsService.getUserPoints(mockUser.id);

    expect(userServiceMock.findOne).toHaveBeenCalledWith(mockUser.id);
    expect(points).toBe(20);
  });

  it('should return 0 if user not found', async () => {
    jest.spyOn(userServiceMock, 'findOne').mockResolvedValue(null);

    const points = await pointsService.getUserPoints(1);

    expect(userServiceMock.findOne).toHaveBeenCalledWith(1);
    expect(points).toBe(0);
  });

  it('should calculate time difference in hours', () => {
    const start = new Date('2023-11-10T10:00:00Z');
    const end = new Date('2023-11-10T16:00:00Z');

    const result = (pointsService as any).timeDifferenceInHours(start, end);

    expect(result).toBe(6);
  });
});
