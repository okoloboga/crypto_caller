import { Controller, Post, Patch, Body, Param } from '@nestjs/common';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // Register a new user based on their Telegram ID
  @Post('register')
  async registerUser(@Body('telegramId') telegramId: string, @Body('phoneNumber') phoneNumber?: string) {
    // Call the service method to register the user and return the result
    return this.userService.registerUser(telegramId, phoneNumber);
  }

  // Update the subscription status of a user by their ID
  @Patch(':id/subscription')
  async updateSubscriptionStatus(@Param('id') id: number, @Body('status') status: string) {
    // Update subscription status (e.g., 'active' or 'inactive')
    return this.userService.updateSubscriptionStatus(id, status);
  }
}