import { Controller, Post, Get, Param } from '@nestjs/common';
import { PointsService } from './points.service';

@Controller('points')
export class PointsController {
  constructor(private readonly pointsService: PointsService) {}

  // Запрос для начисления очков пользователю
  @Post('accumulate/:userId')
  async accumulatePoints(@Param('userId') walletAddress: string) {
    await this.pointsService.accumulatePoints(walletAddress);
    return { message: 'Points accumulated successfully' };
  }

  // Запрос для получения текущих очков пользователя
  @Get('check/:userId')
  async getUserPoints(@Param('userId') walletAddress: string) {
    const points = await this.pointsService.getUserPoints(walletAddress);
    return { points };
  }
}