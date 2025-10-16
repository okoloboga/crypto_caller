import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { RelayerService } from './relayer.service';
import { RelayerController } from './relayer.controller';
import { UserModule } from '../user/user.module';

@Module({
  imports: [HttpModule, forwardRef(() => UserModule)],
  controllers: [RelayerController],
  providers: [RelayerService],
  exports: [RelayerService],
})
export class RelayerModule {}