/**
 * Global exception filter for the RUBLE Farming App backend.
 * This filter catches all unhandled exceptions (both HTTP and non-HTTP) and formats
 * the error response in a consistent structure, including the status code, timestamp,
 * request path, and error message. It ensures that clients receive a standardized
 * error response for all errors.
 */

import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common'; // Import NestJS core exception handling utilities

/**
 * AllExceptionsFilter class implementing a global exception filter.
 * Catches all exceptions and returns a formatted error response.
 */
@Catch() // Catch all exceptions (no specific exception type)
export class AllExceptionsFilter implements ExceptionFilter {
  /**
   * Handle an exception and format the error response.
   * @param exception - The exception that was thrown (can be of any type).
   * @param host - The ArgumentsHost providing access to the request and response objects.
   */
  catch(exception: unknown, host: ArgumentsHost) {
    // Switch to HTTP context to access the response and request objects
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    // Determine the HTTP status code
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Determine the error message
    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    // Send a formatted error response
    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    });
  }
}