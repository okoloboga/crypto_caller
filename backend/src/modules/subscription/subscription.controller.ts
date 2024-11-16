import { Controller, Post, Delete, Get, Body, Request, UsePipes, ValidationPipe } from '@nestjs/common';  // Импортируем Body
import { SubscriptionService } from './subscription.service';
import { UserService } from '../user/user.service';  // Импортируем UserService
import { CreateSubscriptionDto } from './dto/create-subscription.dto';

@Controller('subscription')
export class SubscriptionController {
  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly userService: UserService,
  ) {}

  // Check subscription status
  @Get('status')
  async checkSubscription(@Request() req) {
    const telegramId = req.user.telegramId; // Telegram ID из аутентификации
    return this.subscriptionService.checkSubscription(telegramId);
  }

  // Create a new subscription
  @Post()
  @UsePipes(new ValidationPipe())
  async createSubscription(@Request() req, @Body('phoneNumber') phoneNumber: string) {
    const telegramId = req.user.telegramId; // Telegram ID из аутентификации
    return this.subscriptionService.createSubscription(telegramId, phoneNumber);
  }

  // Cancel subscription
  @Delete()
  async cancelSubscription(@Request() req) {
    const telegramId = req.user.telegramId; // Telegram ID из аутентификации
    return this.subscriptionService.cancelSubscription(telegramId);
  }
}
