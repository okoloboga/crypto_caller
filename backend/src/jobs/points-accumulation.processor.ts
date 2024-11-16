import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { UserService } from '../modules/user/user.service';
import { MAX_POINTS, POINTS_INTERVAL } from '../shared/constants';

@Processor('points-accumulation')  // Указываем имя очереди
export class PointsAccumulationJob {
  constructor(private readonly userService: UserService) {}

  @Process()
  async accumulatePoints(job: Job): Promise<void> {
    try {
      const users = await this.userService.findActiveSubscribedUsers();
  
      for (const user of users) {
        const newPoints = Math.min(user.points + 2, MAX_POINTS);
        const lastCollectedAt = user.lastPointsCollectedAt;
  
        if (new Date().getTime() - lastCollectedAt.getTime() >= POINTS_INTERVAL * 1000) {
          await this.userService.updatePoints(user.id, newPoints, new Date());
          console.log(`Added points for user ${user.id}`);
        }
      }
    } catch (error) {
      console.error('Error during points accumulation:', error);
    }
  }
  
}