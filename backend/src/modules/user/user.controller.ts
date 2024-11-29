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
      return false;
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

  // Обновление очков (при заходе пользователя в приложение)
  // Обновление очков
  @Post('update-points')
  async updatePoints(@Body() { walletAddress, newPoints }: { walletAddress: string, newPoints: number }): Promise<number> {
    console.log(`update-points called with walletAddress: ${walletAddress} and newPoints: ${newPoints}`); // Логируем вызов

    if (!walletAddress) {
      throw new BadRequestException('Wallet address is required');
    }

    if (newPoints === undefined) {
      throw new BadRequestException('New points are required');
    }

    try {
      // Передаем newPoints для записи в lastPoints
      const points = await this.userService.updatePoints(walletAddress, newPoints);
      console.log(`Points returned from updatePoints service: ${points}`); // Логируем результат
      return points;
    } catch (error) {
      console.error(`Error in update-points: ${error.message}`); // Логируем ошибку
      throw new BadRequestException(error.message);
    }
  }

  // Сбор очков
  @Post('claim-points')
  async claimPoints(@Body() body: { walletAddress: string, points: number }) {
    const { walletAddress, points } = body;

    if (!walletAddress || points === undefined || points === null) {
      throw new BadRequestException('Wallet address and points are required');
    }

    try {
      // Вызов функции для добавления очков в базу данных
      await this.userService.claimPoints(walletAddress, points);
      return { message: 'Points successfully claimed and added to the user\'s account.' };
    } catch (error) {
      console.error('Error claiming points:', error);
      throw new InternalServerErrorException('Error claiming points.');
    }
  }
}