import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { TonService } from './ton.service';

@Controller('withdrawal')
export class WithdrawalController {
  constructor(private readonly tonService: TonService) {}

  @Post('send-tokens')
  async sendTokens(@Body() body: { recipientAddress: string; amount: string }) {
    const { recipientAddress, amount } = body;

    if (!recipientAddress || !amount) {
      throw new HttpException('Missing recipientAddress or amount', HttpStatus.BAD_REQUEST);
    }

    try {
      const result = await this.tonService.sendTokens(recipientAddress, amount);
      return result;
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}