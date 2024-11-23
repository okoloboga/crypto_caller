import { Controller, Post, Body, Param, Get,
         Patch, Query, BadRequestException, 
         InternalServerErrorException} from '@nestjs/common';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // Update the subscription status of a user by their WalletAddress
  @Post('subscription')
  async createSubscription(
    @Body('walletAddress') walletAddress: string,
    @Body('phoneNumber') phoneNumber: string,
  ) {
    return this.userService.createSubscription(walletAddress, phoneNumber);
  }

  @Get('subscription-status')
  async getSubscriptionStatus(@Query('walletAddress') walletAddress: string): Promise<boolean> {
    if (!walletAddress) {
      throw new BadRequestException('Wallet address is required');
    }
  
    try {
      // Возвращаем результат напрямую, без обёртки в объект
      return await this.userService.checkSubscriptionStatus(walletAddress);
    } catch (error) {
      console.error(`Ошибка получения статуса подписки для ${walletAddress}:`, error);
      throw new InternalServerErrorException('Ошибка получения статуса подписки');
    }
  }
  

  // Get user by Wallet Address
  @Get(':walletAddress')

  async getUserByWalletAddress(@Param('walletAddress') walletAddress: string) {
    const user = await this.userService.findOne(walletAddress);
  
    if (!user) {
      return { message: `User not found.` };
    }
    return user;
  }

  // Update the phone number of a user by Wallet Address
  @Patch(':walletAddress/phone')
  async updatePhoneNumber(
    @Param('walletAddress') walletAddress: string,
    @Body('phoneNumber') phoneNumber: string,
  ) {
    const user = await this.userService.updatePhoneNumber(walletAddress, phoneNumber);
    if (!user) {
      return { message: `User not found with wallet address ${walletAddress}.` };
    }
    return user;
  }
}