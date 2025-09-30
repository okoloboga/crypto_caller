import { Injectable } from '@nestjs/common';
import { TonClient, Address, Cell, beginCell } from '@ton/ton';

@Injectable()
export class SubscriptionService {
  private client: TonClient;
  private contractAddress: Address;

  constructor() {
    this.client = new TonClient({
      endpoint: 'https://toncenter.com/api/v2/jsonRPC',
      apiKey: process.env.TON_API_KEY,
    });

    if (!process.env.SUBSCRIPTION_CONTRACT_ADDRESS) {
      // This is a critical error, but let's not throw, 
      // as the app should be able to start. We'll log the error.
      console.error('FATAL: SUBSCRIPTION_CONTRACT_ADDRESS is not defined in .env');
      // A better solution would be to use a config module that validates env vars on startup.
    } else {
        this.contractAddress = Address.parse(process.env.SUBSCRIPTION_CONTRACT_ADDRESS);
    }
  }

  async checkSubscription(walletAddress: string): Promise<{ expiresAt: number }> {
    if (!this.contractAddress) {
        return { expiresAt: 0 };
    }
    try {
      const userAddress = Address.parse(walletAddress);
      
      const addressCell = beginCell().storeAddress(userAddress).endCell();

      const response = await this.client.runMethod(this.contractAddress, 'isSubscribed', [
        { type: 'slice', cell: addressCell },
      ]);

      const expiresAt = response.stack.readNumber();
      return { expiresAt };
    } catch (error) {
      console.error(`Error checking subscription for ${walletAddress}:`, error);
      return { expiresAt: 0 };
    }
  }

  async getConfig(): Promise<{ contractAddress: string; price: string }> {
    // The price can be fetched from the contract to be dynamic
    // For now, we will use an environment variable as a placeholder, falling back to a default.
    const price = process.env.SUBSCRIPTION_PRICE || '0.75';

    return {
      contractAddress: this.contractAddress ? this.contractAddress.toString() : '',
      price,
    };
  }
}
