/**
 * Controller for handling ticket-related operations in the RUBLE Farming App backend.
 * This controller provides endpoints for creating and deleting tickets, which are likely used
 * for user feedback or support requests. It is part of the TicketModule and uses the TicketService
 * to perform the actual operations.
 */

import { Controller, Post, Body, Delete, ConflictException } from '@nestjs/common'; // Import NestJS core decorators and exceptions
import { TicketService } from './tickets.service'; // Import the TicketService for business logic
import { Ticket } from './tickets.entity'; // Import the Ticket entity for type definitions

/**
 * TicketController class handling ticket management endpoints.
 * Routes are prefixed with '/api/tickets' due to the global API prefix and controller path.
 */
@Controller('tickets')
export class TicketController {
  /**
   * Constructor to inject dependencies.
   * @param ticketService - The service handling ticket-related operations.
   */
  constructor(private readonly ticketService: TicketService) {}

  /**
   * Create a new ticket for a user.
   * Endpoint: POST /api/tickets
   * @param userId - The ID of the user creating the ticket.
   * @param message - The message or content of the ticket.
   * @returns The created ticket.
   * @throws ConflictException if a ticket for the user already exists.
   * @throws Error if ticket creation fails for other reasons.
   */
  @Post()
  async createTicket(
    @Body('userId') userId: string,
    @Body('message') message: string,
  ): Promise<Ticket> {
    try {
      // Delegate ticket creation to the TicketService
      return await this.ticketService.createTicket(userId, message);
    } catch (error) {
      // Rethrow ConflictException directly
      if (error instanceof ConflictException) {
        throw error;
      }
      // Rethrow other errors
      throw error;
    }
  }

  /**
   * Delete a ticket for a user.
   * Endpoint: DELETE /api/tickets
   * @param userId - The ID of the user whose ticket is to be deleted.
   * @returns The deleted ticket.
   * @throws ConflictException if the ticket does not exist.
   * @throws Error if ticket deletion fails for other reasons.
   */
  @Delete()
  async deleteTicket(
    @Body('userId') userId: string,
  ): Promise<Ticket> {
    try {
      // Delegate ticket deletion to the TicketService
      return await this.ticketService.deleteTicket(userId);
    } catch (error) {
      // Rethrow ConflictException directly
      if (error instanceof ConflictException) {
        throw error;
      }
      // Rethrow other errors
      throw error;
    }
  }
}