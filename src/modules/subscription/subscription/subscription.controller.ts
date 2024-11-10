import { Controller, Post, Delete, Get, Param, Body } from '@nestjs/common';  // Импортируем Body
import { SubscriptionService } from './subscription.service';
import { UserService } from '../../user/user/user.service';  // Импортируем UserService
import { CreateSubscriptionDto } from '../dto/create-subscription.dto';

@Controller('subscription')
export class SubscriptionController {
  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly userService: UserService,
  ) {}

  @Get('check/:userId')
  async checkSubscription(@Param('userId') userId: number) {
    const isActive = await this.subscriptionService.isActiveSubscription(userId);
    return { isActive };
  }

  @Post('create/:userId')
  async createSubscription(
    @Param('userId') userId: number,
    @Body() createSubscriptionDto: CreateSubscriptionDto,  // Используем правильный @Body()
  ) {
    const user = await this.userService.findOne(userId);  // Получаем пользователя по ID
    return this.subscriptionService.createSubscription(user, createSubscriptionDto.expirationDate);
  }

  @Delete('deactivate/:userId')
  async deactivateSubscription(@Param('userId') userId: number) {
    await this.subscriptionService.deactivateSubscription(userId);
    return { message: 'Subscription deactivated' };
  }
}
