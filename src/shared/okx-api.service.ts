import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class OkxApiService {
  private readonly logger = new Logger(OkxApiService.name);

  constructor(private readonly httpService: HttpService) {}

  // Получаем текущую цену для валютной пары
  async getCurrentPrice(pair: string): Promise<number> {
    try {
      // Формируем URL и заголовки
      const url = `https://www.okx.com/api/v5/market/ticker?instId=${pair}`;
      const headers = {
        'OK-API-KEY': process.env.OKX_API_KEY,
        'OK-API-SIGN': process.env.OKX_API_SECRET,
        'OK-API-PASSPHRASE': process.env.OKX_API_PASSPHRASE,
      };

      // Делаем запрос
      const response = await firstValueFrom(
        this.httpService.get(url, { headers })
      );

      const data = response.data.data;

      // Если данные найдены, возвращаем цену
      if (data && data[0] && data[0].last) {
        return parseFloat(data[0].last);
      } else {
        this.logger.warn(`No price data found for pair: ${pair}`);
        return null;
      }
    } catch (error) {
      this.logger.error(`Failed to fetch price for ${pair}`, error.message);
      throw new Error(`Could not fetch price for ${pair}`);
    }
  }
}
