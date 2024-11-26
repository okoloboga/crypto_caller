import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Point } from './points.entity';
import { PointsService } from './points/points.service';
import { PointsController } from './points/points.controller';
import { UserService } from '../user/user/user.service'; 

@Module({
  imports: [TypeOrmModule.forFeature([Point])],
  providers: [PointsService, UserService],
  controllers: [PointsController],
})
export class PointsModule {}