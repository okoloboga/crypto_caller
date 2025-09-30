/**
 * Entry point for the RUBLE Farming App backend.
 * This file initializes the NestJS application, configures HTTPS, sets up global settings
 * (such as API prefix, exception filters, and CORS), and starts the server on port 3000.
 */

import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './shared/exceptions/all-exceptions.filter';
import * as dotenv from 'dotenv';

dotenv.config();
import { readFileSync } from 'fs'; // Import readFileSync to read SSL certificate files

/**
 * Bootstrap function to initialize and start the NestJS application.
 * Configures HTTPS, global API prefix, exception handling, CORS, and starts the server.
 */
async function bootstrap() {
  // Configure HTTPS options by reading SSL key and certificate from environment variables
  const httpsOptions = {
    key: readFileSync(process.env.SSL_KEY), // Path to the SSL private key
    cert: readFileSync(process.env.SSL_CERT), // Path to the SSL certificate
  };
  
  // Create the NestJS application with HTTPS support
  const app = await NestFactory.create(AppModule, { httpsOptions });

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
  logger.log('Application is running on: https://caller.ruble.website');
}

// Execute the bootstrap function to start the application
bootstrap();