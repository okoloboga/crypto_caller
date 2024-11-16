import { Test, TestingModule } from '@nestjs/testing';
import { PointsAccumulationJob } from './points-accumulation.processor';
import { UserService } from '../modules/user/user.service';

describe('PointsAccumulationJob', () => {
  let pointsAccumulationJob: PointsAccumulationJob;
  let userServiceMock: Partial<UserService>;

  beforeEach(async () => {
    userServiceMock = {
      findActiveSubscribedUsers: jest.fn(),
      updatePoints: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PointsAccumulationJob,
        { provide: UserService, useValue: userServiceMock },
      ],
    }).compile();

    pointsAccumulationJob = module.get<PointsAccumulationJob>(PointsAccumulationJob);
  });

  it('should add points to users', async () => {
    const mockUsers = [
      { id: 1, points: 10, lastPointsCollectedAt: new Date(Date.now() - 7 * 60 * 60 * 1000) }, // 7 часов назад
      { id: 2, points: 20, lastPointsCollectedAt: new Date(Date.now() - 8 * 60 * 60 * 1000) }, // 8 часов назад
    ];

    jest.spyOn(userServiceMock, 'findActiveSubscribedUsers').mockResolvedValue(mockUsers as any);

    await pointsAccumulationJob.accumulatePoints({} as any);

    expect(userServiceMock.updatePoints).toHaveBeenCalledTimes(2);
    expect(userServiceMock.updatePoints).toHaveBeenCalledWith(
      1,
      12, // Новые очки (10 + 2)
      expect.any(Date),
    );
    expect(userServiceMock.updatePoints).toHaveBeenCalledWith(
      2,
      22, // Новые очки (20 + 2)
      expect.any(Date),
    );
  });

  it('should log error if something goes wrong', async () => {
    jest.spyOn(userServiceMock, 'findActiveSubscribedUsers').mockRejectedValue(new Error('Test error'));
    const consoleErrorMock = jest.spyOn(console, 'error').mockImplementation(() => {});

    await pointsAccumulationJob.accumulatePoints({} as any);

    expect(consoleErrorMock).toHaveBeenCalledWith(
      'Error during points accumulation:',
      expect.any(Error),
    );
    consoleErrorMock.mockRestore();
  });
});
