import { Controller, Post, Body, Logger } from '@nestjs/common';
import { RelayerService } from './relayer.service';
import { UserService } from '../user/user.service';

export interface SwapResultDto {
  userAddress: string;
  success: boolean;
  txId: string;
  jettonAmount?: string;
  error?: string;
}

@Controller('relayer')
export class RelayerController {
  private readonly logger = new Logger(RelayerController.name);

  constructor(
    private readonly relayerService: RelayerService,
    private readonly userService: UserService,
  ) {}

  @Post('swap-result')
  async handleSwapResult(@Body() data: SwapResultDto) {
    this.logger.log(`Received swap result: ${JSON.stringify(data)}`);
    
    try {
      // Here you can update user subscription status based on the result
      // For example, activate subscription if success, or handle refund if failed
      
      if (data.success) {
        this.logger.log(`✅ Swap successful for user ${data.userAddress}, jetton amount: ${data.jettonAmount}`);
        this.logger.log(`🔄 Activating subscription for user: ${data.userAddress}`);
        
        try {
          // Activate user subscription
          await this.userService.activateSubscription(data.userAddress);
          this.logger.log(`✅ Subscription activated successfully for user: ${data.userAddress}`);
        } catch (error) {
          this.logger.error(`❌ Failed to activate subscription for user ${data.userAddress}: ${error.message}`);
        }
      } else {
        this.logger.log(`❌ Swap failed for user ${data.userAddress}: ${data.error}`);
        this.logger.log(`🔄 Handling failed swap for user: ${data.userAddress}`);
        
        try {
          // Handle failed subscription
          await this.userService.handleFailedSubscription(data.userAddress, data.error);
          this.logger.log(`✅ Failed subscription handled for user: ${data.userAddress}`);
        } catch (error) {
          this.logger.error(`❌ Failed to handle failed subscription for user ${data.userAddress}: ${error.message}`);
        }
      }
      
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to handle swap result: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}