import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class OkxApiService {
  private readonly logger = new Logger(OkxApiService.name);

  constructor(private readonly httpService: HttpService) {}

  async getCurrentPrice(currencyPair: string): Promise<number> {
    if (!/^[A-Z0-9]+\-[A-Z0-9]+$/.test(currencyPair)) {
      throw new Error(`Invalid pair format: ${currencyPair}`);
    }

    try {
      const currencyPairSwap = currencyPair + '-SWAP';
      const url = `https://www.okx.com/api/v5/market/ticker?instId=${currencyPairSwap}`;
      const headers = {
        'OK-API-KEY': process.env.OKX_API_KEY,
        'OK-API-SIGN': process.env.OKX_API_SECRET,
        'OK-API-PASSPHRASE': process.env.OKX_API_PASSPHRASE,
      };

      const response = await firstValueFrom(
        this.httpService.get(url, { headers })
      );

      const data = response.data.data;

      this.logger.log(`Data for ${currencyPairSwap}: ${JSON.stringify(data.last)}`);

      if (data && data[0] && data[0].last) {
        return parseFloat(data[0].last);
      } else {
        this.logger.warn(`No price data found for pair: ${currencyPairSwap}`);
        return null;
      }
    } catch (error) {
      const status = error.response?.status || 'unknown';
      const errorMessage = error.response?.data || error.message;
      this.logger.error(`Failed to fetch price for ${currencyPair}: ${status}`, errorMessage);
      throw new Error(`Could not fetch price for ${currencyPair}: ${errorMessage}`);
    }
  }
}
