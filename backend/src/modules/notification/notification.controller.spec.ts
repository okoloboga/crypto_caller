import { Test, TestingModule } from '@nestjs/testing';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';

describe('NotificationController (Integration)', () => {
  let notificationController: NotificationController;
  let notificationServiceMock: Partial<NotificationService>;

  beforeEach(async () => {
    notificationServiceMock = {
      makeCall: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationController],
      providers: [{ provide: NotificationService, useValue: notificationServiceMock }],
    }).compile();

    notificationController = module.get<NotificationController>(NotificationController);
  });

  it('should initiate a call successfully', async () => {
    jest.spyOn(notificationServiceMock, 'makeCall').mockResolvedValue();

    const result = await notificationController.makeCall('+1234567890', 1);

    expect(notificationServiceMock.makeCall).toHaveBeenCalledWith('+1234567890', 1);
    expect(result).toEqual({ message: 'Call initiated to +1234567890 for task 1' });
  });

  it('should throw an error if the call fails', async () => {
    const errorMessage = 'Twilio error';
    jest.spyOn(notificationServiceMock, 'makeCall').mockRejectedValue(new Error(errorMessage));

    try {
        await notificationController.makeCall('+1234567890', 1);
      } catch (error) {
        expect(error.message).toBe('Failed to make call');
        expect(error.response.details).toBe(errorMessage);
      }
      

    expect(notificationServiceMock.makeCall).toHaveBeenCalledWith('+1234567890', 1);
  });
});
