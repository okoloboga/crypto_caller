import { Controller, Post, Body, Logger } from '@nestjs/common';
import { RelayerService } from './relayer.service';

export interface SwapResultDto {
  userAddress: string;
  success: boolean;
  txId: string;
  jettonAmount?: string;
  error?: string;
}

@Controller('api/relayer')
export class RelayerController {
  private readonly logger = new Logger(RelayerController.name);

  constructor(private readonly relayerService: RelayerService) {}

  @Post('swap-result')
  async handleSwapResult(@Body() data: SwapResultDto) {
    this.logger.log(`Received swap result: ${JSON.stringify(data)}`);
    
    try {
      // Here you can update user subscription status based on the result
      // For example, activate subscription if success, or handle refund if failed
      
      if (data.success) {
        this.logger.log(`Swap successful for user ${data.userAddress}, jetton amount: ${data.jettonAmount}`);
        // TODO: Update user subscription status in database
        // await this.userService.activateSubscription(data.userAddress);
      } else {
        this.logger.log(`Swap failed for user ${data.userAddress}: ${data.error}`);
        // TODO: Handle failed swap (maybe send notification to user)
        // await this.userService.handleFailedSubscription(data.userAddress, data.error);
      }
      
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to handle swap result: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}