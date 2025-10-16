import { Controller, Post, Get, Body, Logger } from "@nestjs/common";
import { RelayerService } from "../services/relayer.service";

export interface ProcessSubscriptionDto {
  userAddress: string;
  phoneNumber: string;
  amount: string; // in TON
  txHash: string;
  subscriptionContractAddress: string;
}

@Controller("api/relayer")
export class RelayerController {
  private readonly logger = new Logger(RelayerController.name);

  constructor(private readonly relayerService: RelayerService) {}

  @Post("process-subscription")
  async processSubscription(@Body() data: ProcessSubscriptionDto) {
    this.logger.log(`🔄 Received subscription request from backend`);
    this.logger.log(`📊 Request data:`, {
      userAddress: data.userAddress,
      amount: data.amount,
      txHash: data.txHash,
      subscriptionContractAddress: data.subscriptionContractAddress,
    });

    try {
      this.logger.log(`🚀 Starting subscription processing...`);
      const result = await this.relayerService.processSubscription(data);
      this.logger.log(`✅ Subscription processed successfully: ${result.txId}`);
      this.logger.log(`📋 Processing result:`, result);
      return result;
    } catch (error) {
      this.logger.error(`❌ Failed to process subscription: ${error.message}`);
      this.logger.error(`🔍 Error details:`, {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
      return {
        success: false,
        txId: "",
        message: error.message,
      };
    }
  }

  @Get("health")
  async healthCheck() {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "relayer",
    };
  }
}
