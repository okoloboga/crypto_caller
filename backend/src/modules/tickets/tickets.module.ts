/**
 * Feature module for ticket-related functionality in the RUBLE Farming App backend.
 * This module encapsulates the logic for managing user feedback or support tickets.
 * It provides the TicketService and TicketController, and integrates with the Ticket entity
 * for database operations using TypeORM.
 */

import { Module } from '@nestjs/common'; // Import Module decorator for defining NestJS modules
import { TypeOrmModule } from '@nestjs/typeorm'; // Import TypeOrmModule for database integration
import { TicketController } from './tickets.controller'; // Import the TicketController for HTTP endpoints
import { TicketService } from './tickets.service'; // Import the TicketService for business logic
import { Ticket } from './tickets.entity'; // Import the Ticket entity for database mapping

/**
 * TicketModule class defining the ticket feature module.
 * Configures the module by providing the TicketService, registering the TicketController,
 * and setting up TypeORM for the Ticket entity.
 */
@Module({
  imports: [
    // Configure TypeORM to use the Ticket entity for database operations
    TypeOrmModule.forFeature([Ticket]),
  ],
  controllers: [
    TicketController, // Register the TicketController to handle HTTP requests
  ],
  providers: [
    TicketService, // Provide the TicketService for dependency injection
  ],
})
export class TicketModule {}