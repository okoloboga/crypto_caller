
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Point } from '../points.entity';
import { UserService } from '../../user/user/user.service';  // Для работы с пользователем
import { User } from '../../user/user.entity';

@Injectable()
export class PointsService {
  constructor(
    @InjectRepository(Point)
    private pointsRepository: Repository<Point>,
    private userService: UserService, // Для работы с пользователем
  ) {}

  // Метод для начисления очков
  async accumulatePoints(userId: number): Promise<void> {
    const user = await this.userService.findOne(userId);
    if (user) {
      const lastCollectedAt = user.lastPointsCollectedAt;
      const now = new Date();

      // Проверяем, прошло ли 6 часов с последнего сбора
      if (this.timeDifferenceInHours(lastCollectedAt, now) >= 6) {
        const points = 2;  // Начисляем 2 очка

        // Создаем запись о начисленных очках
        const point = this.pointsRepository.create({
          points,
          lastCollectedAt: now,
          user,
        });
        await this.pointsRepository.save(point);

        // Обновляем время последнего сбора очков у пользователя
        user.lastPointsCollectedAt = now;
        user.points += points;  // Увеличиваем общие очки пользователя
        await this.userService.updatePoints(user.id, user.points, now);
      }
    }
  }

  // Метод для получения очков пользователя
  async getUserPoints(userId: number): Promise<number> {
    const user = await this.userService.findOne(userId);
    return user ? user.points : 0;
  }

  // Метод для вычисления разницы времени в часах
  private timeDifferenceInHours(start: Date, end: Date): number {
    const diffInMilliseconds = end.getTime() - start.getTime();
    return diffInMilliseconds / (1000 * 60 * 60); // Конвертируем в часы
  }
}