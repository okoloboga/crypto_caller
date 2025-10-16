import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './shared/exceptions/all-exceptions.filter';
import * as dotenv from 'dotenv';

dotenv.config();
async function bootstrap() {
  // Create the NestJS application in HTTP mode (SSL handled by nginx)
  const app = await NestFactory.create(AppModule);

  // Initialize a logger for the bootstrap process
  const logger = new Logger('Bootstrap');

  // Set a global prefix for all API routes (e.g., /api/endpoint)
  app.setGlobalPrefix('api');

  // Apply a global exception filter to handle all uncaught exceptions
  app.useGlobalFilters(new AllExceptionsFilter());

  // Enable CORS to allow cross-origin requests from specified domains
  app.enableCors({
    origin: ['https://caller.ruble.website', 'http://localhost:3000'], // Allowed origins for CORS
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // Allowed HTTP methods
    credentials: true, // Allow credentials (e.g., cookies, authorization headers)
  });

  // Start the application on port 3000
  await app.listen(3000);
  
  // Log the application URL after successful startup
  logger.log('Backend API is running on: http://localhost:3000 (SSL handled by nginx)');
}

// Execute the bootstrap function to start the application
bootstrap();