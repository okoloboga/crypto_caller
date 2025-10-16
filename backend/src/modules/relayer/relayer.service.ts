import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface RelayerSubscriptionRequest {
  userAddress: string;
  phoneNumber: string;
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
      this.logger.log(`🔄 Starting relayer notification process`);
      this.logger.log(`📊 Relayer URL: ${this.relayerUrl}`);
      this.logger.log(`📋 Request data:`, {
        userAddress: data.userAddress,
        amount: data.amount,
        txHash: data.txHash,
        subscriptionContractAddress: data.subscriptionContractAddress,
      });
      
      const fullUrl = `${this.relayerUrl}/api/relayer/process-subscription`;
      this.logger.log(`🌐 Making HTTP POST request to: ${fullUrl}`);
      
      const response = await firstValueFrom(
        this.httpService.post(fullUrl, data)
      );

      this.logger.log(`✅ Relayer HTTP request successful`);
      this.logger.log(`📋 Response status: ${response.status}`);
      this.logger.log(`📋 Response data: ${JSON.stringify(response.data)}`);
      
      return response.data;
    } catch (error) {
      this.logger.error(`❌ Failed to send subscription to relayer`);
      this.logger.error(`🔍 Error type: ${error.constructor.name}`);
      this.logger.error(`🔍 Error message: ${error.message}`);
      this.logger.error(`🔍 Error details:`, {
        code: error.code,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText,
      });
      throw error;
    }
  }

  /**
   * Check relayer health
   */
  async checkHealth(): Promise<boolean> {
    try {
      this.logger.log(`🔍 Checking relayer health at: ${this.relayerUrl}/api/relayer/health`);
      
      const response = await firstValueFrom(
        this.httpService.get(`${this.relayerUrl}/api/relayer/health`)
      );
      
      this.logger.log(`📊 Health check response: status=${response.status}, data=${JSON.stringify(response.data)}`);
      return response.status === 200;
    } catch (error) {
      this.logger.error(`❌ Relayer health check failed: ${error.message}`);
      this.logger.error(`🔍 Health check error details:`, {
        code: error.code,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText,
      });
      return false;
    }
  }
}