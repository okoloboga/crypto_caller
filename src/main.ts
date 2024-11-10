import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Логирование в консоль
  const logger = new Logger('Bootstrap');

  // Прослушиваем порт 3000 (по умолчанию)
  await app.listen(3000);
  logger.log('Application is running on: http://localhost:3000');
}

bootstrap();
