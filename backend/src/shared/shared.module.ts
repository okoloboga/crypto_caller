import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { OkxApiService } from './okx-api.service';

@Module({
  imports: [HttpModule], // Импортируем HttpModule для выполнения HTTP-запросов
  providers: [OkxApiService],
  exports: [OkxApiService],
})
export class SharedModule {}
