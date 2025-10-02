import { Controller, Post, Get, Body, Logger } from "@nestjs/common";
import { RelayerService } from "../services/relayer.service";

export interface ProcessSubscriptionDto {
  userAddress: string;
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
    this.logger.log(`Received subscription request: ${JSON.stringify(data)}`);

    try {
      const result = await this.relayerService.processSubscription(data);
      this.logger.log(`Subscription processed successfully: ${result.txId}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to process subscription: ${error.message}`);
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
