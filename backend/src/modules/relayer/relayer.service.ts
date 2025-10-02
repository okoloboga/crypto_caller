import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface RelayerSubscriptionRequest {
  userAddress: string;
  amount: string; // in TON
  txHash: string;
  subscriptionContractAddress: string;
}

export interface RelayerSubscriptionResponse {
  success: boolean;
  txId: string;
  message?: string;
}

@Injectable()
export class RelayerService {
  private readonly logger = new Logger(RelayerService.name);
  private readonly relayerUrl: string;

  constructor(private readonly httpService: HttpService) {
    this.relayerUrl = process.env.RELAYER_URL || 'http://relayer:3001';
  }

  /**
   * Notify relayer about new subscription payment
   */
  async processSubscription(data: RelayerSubscriptionRequest): Promise<RelayerSubscriptionResponse> {
    try {
      this.logger.log(`Sending subscription to relayer: ${data.userAddress}, amount: ${data.amount}`);
      
      const response = await firstValueFrom(
        this.httpService.post(`${this.relayerUrl}/api/relayer/process-subscription`, data)
      );

      this.logger.log(`Relayer response: ${JSON.stringify(response.data)}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to send subscription to relayer: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check relayer health
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.relayerUrl}/api/relayer/health`)
      );
      return response.status === 200;
    } catch (error) {
      this.logger.error(`Relayer health check failed: ${error.message}`);
      return false;
    }
  }
}