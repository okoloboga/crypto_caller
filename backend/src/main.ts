import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { AllExceptionsFilter } from './shared/exceptions/all-exceptions.filter';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const logger = new Logger('Bootstrap');
  app.useGlobalFilters(new AllExceptionsFilter());

  // Прослушиваем порт 3000 (по умолчанию)
  await app.listen(3000);
  logger.log('Application is running on: http://localhost:3000');
}

bootstrap();
