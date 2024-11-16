import { Test, TestingModule } from '@nestjs/testing';
import { OkxApiService } from './okx-api.service';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';

function createMockAxiosResponse(data: any): any {
    return {
      data,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {},
    };
  }  

describe('OkxApiService', () => {
  let okxApiService: OkxApiService;
  let httpServiceMock: Partial<HttpService>;

  beforeEach(async () => {
    httpServiceMock = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OkxApiService,
        { provide: HttpService, useValue: httpServiceMock },
      ],
    }).compile();

    okxApiService = module.get<OkxApiService>(OkxApiService);
  });

  it('should return current price for a valid pair', async () => {
    const mockResponse = {
      data: {
        data: [{ last: '12345.67' }],
      },
    };

    jest.spyOn(httpServiceMock, 'get').mockReturnValue(of(createMockAxiosResponse({
        data: [{ last: '12345.67' }],
    })));

    const price = await okxApiService.getCurrentPrice('BTC/USDT');

    expect(price).toBe(12345.67);
    expect(httpServiceMock.get).toHaveBeenCalledWith(
      'https://www.okx.com/api/v5/market/ticker?instId=BTC/USDT',
      expect.any(Object),
    );
  });

  it('should log warning and return null if no price data found', async () => {
    // Возвращаем пустой массив данных
    jest.spyOn(httpServiceMock, 'get').mockReturnValue(of(createMockAxiosResponse({
      data: [], // Пустой массив данных
    })));
    const loggerSpy = jest.spyOn(okxApiService['logger'], 'warn');
  
    const price = await okxApiService.getCurrentPrice('BTC/USDT');
  
    expect(price).toBeNull(); // Проверяем, что возвращается null
    expect(loggerSpy).toHaveBeenCalledWith('No price data found for pair: BTC/USDT');
  });
  

  it('should throw an error if the API call fails', async () => {
    const mockError = {
        response: {
        status: 500,
        data: 'Internal Server Error',
        },
    };

    jest.spyOn(httpServiceMock, 'get').mockReturnValue(throwError(() => mockError));
    const loggerSpy = jest.spyOn(okxApiService['logger'], 'error');

    await expect(okxApiService.getCurrentPrice('BTC/USDT')).rejects.toThrow('Could not fetch price for BTC/USDT');

    expect(loggerSpy).toHaveBeenCalledWith(
        'Failed to fetch price for BTC/USDT: 500', // Обновлено: включён код статуса
        'Internal Server Error',
    );
  });

  it('should throw an error for invalid pair format', async () => {
    await expect(okxApiService.getCurrentPrice('INVALID_PAIR')).rejects.toThrow('Invalid pair format: INVALID_PAIR');
  });
});
