/**
 * Service for handling ticket-related operations in the RUBLE Farming App backend.
 * This service provides methods for creating and deleting tickets, which are likely used
 * for user feedback or support requests. It interacts with the database using TypeORM
 * and is part of the TicketModule.
 */

import { Injectable, ConflictException, NotFoundException } from '@nestjs/common'; // Import NestJS core exceptions
import { InjectRepository } from '@nestjs/typeorm'; // Import InjectRepository for repository injection
import { Repository } from 'typeorm'; // Import Repository for database operations
import { Ticket } from './tickets.entity'; // Import the Ticket entity for database mapping

/**
 * TicketService class providing business logic for ticket management.
 * Handles ticket creation and deletion, ensuring uniqueness of tickets per user.
 */
@Injectable()
export class TicketService {
  /**
   * Constructor to inject dependencies.
   * @param ticketRepository - The repository for Ticket entities.
   */
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
  ) {}

  /**
   * Create a new ticket for a user.
   * Ensures that only one ticket exists per user by checking for duplicates.
   * @param userId - The ID of the user creating the ticket.
   * @param message - The message or content of the ticket.
   * @returns The created ticket.
   * @throws ConflictException if a ticket for the user already exists.
   */
  async createTicket(userId: string, message: string): Promise<Ticket> {
    // Check if a ticket already exists for the user
    const existingTicket = await this.ticketRepository.findOne({ where: { userId } });

    if (existingTicket) {
      // Throw an error if a ticket already exists
      throw new ConflictException(`Ticket with userId ${userId} already exists`);
    }

    // Create and save the new ticket
    const ticket = this.ticketRepository.create({ userId, message });
    return await this.ticketRepository.save(ticket);
  }

  /**
   * Delete a ticket for a user.
   * @param userId - The ID of the user whose ticket is to be deleted.
   * @returns The deleted ticket.
   * @throws NotFoundException if the ticket does not exist.
   */
  async deleteTicket(userId: string): Promise<Ticket> {
    // Find the ticket by userId
    const ticket = await this.ticketRepository.findOne({ where: { userId } });

    if (!ticket) {
      // Throw an error if the ticket is not found
      throw new NotFoundException(`Ticket with id ${userId} not found`);
    }

    // Delete the ticket and return the deleted entity
    await this.ticketRepository.delete({ userId });
    return ticket;
  }
}