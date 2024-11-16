import { Test, TestingModule } from '@nestjs/testing';
import { PointsController } from './points.controller';
import { PointsService } from './points.service';

describe('PointsController (Integration)', () => {
  let pointsController: PointsController;
  let pointsServiceMock: Partial<PointsService>;

  beforeEach(async () => {
    pointsServiceMock = {
      accumulatePoints: jest.fn(),
      getUserPoints: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PointsController],
      providers: [{ provide: PointsService, useValue: pointsServiceMock }],
    }).compile();

    pointsController = module.get<PointsController>(PointsController);
  });

  it('should accumulate points for a user', async () => {
    jest.spyOn(pointsServiceMock, 'accumulatePoints').mockResolvedValue();

    const result = await pointsController.accumulatePoints(1);

    expect(pointsServiceMock.accumulatePoints).toHaveBeenCalledWith(1);
    expect(result).toEqual({ message: 'Points accumulated successfully' });
  });

  it('should return user points', async () => {
    jest.spyOn(pointsServiceMock, 'getUserPoints').mockResolvedValue(42);

    const result = await pointsController.getUserPoints(1);

    expect(pointsServiceMock.getUserPoints).toHaveBeenCalledWith(1);
    expect(result).toEqual({ points: 42 });
  });
});
