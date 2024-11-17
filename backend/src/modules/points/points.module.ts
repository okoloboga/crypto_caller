import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Point } from './points.entity';
import { PointsService } from './points.service';
import { PointsController } from './points.controller';
import { UserService } from '../user/user.service';
import { User } from '../user/user.entity';  // Импортируем User сущность

@Module({
  imports: [
    TypeOrmModule.forFeature([Point]),    // Репозиторий для сущности Point
    TypeOrmModule.forFeature([User]),     // Добавляем репозиторий для User
  ],
  providers: [PointsService, UserService],
  controllers: [PointsController],
})
export class PointsModule {}
