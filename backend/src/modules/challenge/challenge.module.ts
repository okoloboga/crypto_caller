import { Module } from '@nestjs/common';
import { ChallengeService } from './challenge.service';

@Module({
  providers: [ChallengeService],
  exports: [ChallengeService], // Экспортируем, чтобы другие модули могли использовать сервис
})
export class ChallengeModule {}
