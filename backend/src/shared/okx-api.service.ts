/**
 * Service for interacting with the OKX exchange API in the RUBLE Farming App backend.
 * This service provides functionality to fetch the current price of a cryptocurrency pair
 * from the OKX API. It is part of the SharedModule and is used by other modules (e.g., TaskModule)
 * to monitor price changes for price monitoring tasks.
 */

import { Injectable, Logger } from '@nestjs/common'; // Import Injectable decorator and Logger for logging
import { HttpService } from '@nestjs/axios'; // Import HttpService for making HTTP requests
import { firstValueFrom } from 'rxjs'; // Import firstValueFrom to convert Observable to Promise

/**
 * OkxApiService class providing functionality to fetch cryptocurrency prices from the OKX API.
 * Validates currency pair formats and handles API requests with proper error handling.
 */
@Injectable()
export class OkxApiService {
  // Logger instance for logging service operations and errors
  private readonly logger = new Logger(OkxApiService.name);

  /**
   * Constructor to inject dependencies.
   * @param httpService - The HTTP service for making API requests.
   */
  constructor(private readonly httpService: HttpService) {}

  /**
   * Fetch the current price of a cryptocurrency pair from the OKX API.
   * @param currencyPair - The currency pair to fetch the price for (e.g., "BTC-USD").
   * @returns The current price as a number, or null if no price data is found.
   * @throws Error if the currency pair format is invalid or if the API request fails.
   */
  async getCurrentPrice(currencyPair: string): Promise<number> {
    // Validate the currency pair format (e.g., "BTC-USD")
    if (!/^[A-Z0-9]+\-[A-Z0-9]+$/.test(currencyPair)) {
      throw new Error(`Invalid pair format: ${currencyPair}`);
    }

    try {
      // Construct the instrument ID for OKX API (e.g., "BTC-USD-SWAP")
      const currencyPairSwap = currencyPair + '-SWAP';
      const url = `https://www.okx.com/api/v5/market/ticker?instId=${currencyPairSwap}`;
      
      // Set API authentication headers using environment variables
      const headers = {
        'OK-API-KEY': process.env.OKX_API_KEY,
        'OK-API-SIGN': process.env.OKX_API_SECRET,
        'OK-API-PASSPHRASE': process.env.OKX_API_PASSPHRASE,
      };

      // Make the API request to OKX
      const response = await firstValueFrom(
        this.httpService.get(url, { headers })
      );

      const data = response.data.data;

      // Log the fetched price data
      this.logger.log(`Data for ${currencyPairSwap}: ${JSON.stringify(data[0].last)}`);

      // Check if price data is available and return it
      if (data && data[0] && data[0].last) {
        return parseFloat(data[0].last);
      } else {
        this.logger.warn(`No price data found for pair: ${currencyPairSwap}`);
        return null;
      }
    } catch (error) {
      // Extract error details and log the failure
      const status = error.response?.status || 'unknown';
      const errorMessage = error.response?.data || error.message;
      this.logger.error(`Failed to fetch price for ${currencyPair}: ${status}`, errorMessage);
      throw new Error(`Could not fetch price for ${currencyPair}: ${errorMessage}`);
    }
  }
}