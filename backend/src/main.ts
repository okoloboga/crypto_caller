import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { AllExceptionsFilter } from './shared/exceptions/all-exceptions.filter';
import { readFileSync } from 'fs';

async function bootstrap() {
  // Опции HTTPS
  const httpsOptions = {
    key: readFileSync('/etc/letsencrypt/archive/caller.ruble.website/privkey2.pem'),
    cert: readFileSync('/etc/letsencrypt/acrhive/caller.ruble.website/fullchain2.pem'),
  };

  // Создание приложения с поддержкой HTTPS
  const app = await NestFactory.create(AppModule, { httpsOptions });

  const logger = new Logger('Bootstrap');

  // Устанавливаем глобальный префикс API
  app.setGlobalPrefix('api');

  // Устанавливаем глобальный фильтр для обработки исключений
  app.useGlobalFilters(new AllExceptionsFilter());

  // Включаем поддержку CORS
  app.enableCors({
    origin: ['https://caller.ruble.website', 'http://localhost:3000'], // Разрешённые домены
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // Разрешённые методы
    credentials: true, // Если требуются куки/авторизация
  });

  // Запускаем приложение на порту 3000
  await app.listen(3000);
  logger.log('Application is running on: https://caller.ruble.website');
}

bootstrap();
