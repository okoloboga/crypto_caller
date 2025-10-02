import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { RelayerService } from './relayer.service';
import { RelayerController } from './relayer.controller';

@Module({
  imports: [HttpModule],
  controllers: [RelayerController],
  providers: [RelayerService],
  exports: [RelayerService],
})
export class RelayerModule {}