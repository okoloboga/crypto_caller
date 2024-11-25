import { Module } from '@nestjs/common';
import { ChallengeService } from './challenge.service';
import { ChallengeController } from './challenge.controller';

@Module({
  providers: [ChallengeService],
  controllers: [ChallengeController],
  exports: [ChallengeService], // Экспортируем, чтобы другие модули могли использовать сервис
})
export class ChallengeModule {}
