import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';

@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get('config')
  async getConfig() {
    const config = await this.subscriptionService.getConfig();
    if (!config.contractAddress) {
        throw new NotFoundException('Subscription contract address is not configured on the backend.');
    }
    return config;
  }

  @Get(':walletAddress')
  async checkSubscription(@Param('walletAddress') walletAddress: string) {
    return this.subscriptionService.checkSubscription(walletAddress);
  }
}
