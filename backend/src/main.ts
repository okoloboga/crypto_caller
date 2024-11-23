import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { AllExceptionsFilter } from './shared/exceptions/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const logger = new Logger('Bootstrap');

  // Устанавливаем глобальный префикс API
  app.setGlobalPrefix('api');

  // Устанавливаем глобальный фильтр для обработки исключений
  app.useGlobalFilters(new AllExceptionsFilter());

  // Включаем поддержку CORS
  app.enableCors({
    origin: 'http://localhost:3000', // Указываем разрешённый фронтенд
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // Методы, которые разрешены
    credentials: true, // Если нужно использовать куки или токены
  });

  // Запускаем приложение на порту 3000
  await app.listen(3000);
  logger.log('Application is running on: http://localhost:3000');
}

bootstrap();
