/**
 * Shared module for providing common utilities in the RUBLE Farming App backend.
 * This module encapsulates shared services and dependencies, such as the OkxApiService
 * for fetching cryptocurrency prices from the OKX API. It imports the HttpModule for
 * making HTTP requests and exports the OkxApiService for use in other modules (e.g., TaskModule).
 */

import { Module } from '@nestjs/common'; // Import Module decorator for defining NestJS modules
import { HttpModule } from '@nestjs/axios'; // Import HttpModule for HTTP request capabilities
import { OkxApiService } from './okx-api.service'; // Import the OkxApiService for fetching prices

/**
 * SharedModule class defining the shared utilities module.
 * Configures the module by providing the OkxApiService, importing the HttpModule for HTTP requests,
 * and exporting the OkxApiService for use in other modules.
 */
@Module({
  imports: [
    HttpModule, // Import HttpModule to enable HTTP requests (used by OkxApiService)
  ],
  providers: [
    OkxApiService, // Provide the OkxApiService for dependency injection
  ],
  exports: [
    OkxApiService, // Export the OkxApiService for use in other modules (e.g., TaskModule)
  ],
})
export class SharedModule {}