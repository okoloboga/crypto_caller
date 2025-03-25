/**
 * Basic controller for the RUBLE Farming App backend.
 * This controller provides a simple health check endpoint to verify that the server is running.
 * It is mounted at the root path ('/') and responds to GET requests.
 */

import { Controller, Get } from '@nestjs/common'; // Import Controller and Get decorators from NestJS

/**
 * AppController class handling basic application routes.
 * Provides a single endpoint to check if the server is running.
 */
@Controller() // No path specified, so this controller handles requests at the root ('/')
export class AppController {
  /**
   * Handle GET requests to the root endpoint.
   * Returns a simple message to confirm the server is running.
   * @returns {string} A message indicating the server status.
   */
  @Get() // Maps to GET requests at the root path ('/')
  getRoot(): string {
    return 'Server is running!'; // Response message
  }
}