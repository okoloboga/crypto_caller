/**
 * Entity representing a ticket in the RUBLE Farming App backend.
 * This entity maps to the 'ticket' table in the database and stores information about
 * user-submitted tickets, such as user ID, message, and creation date. It is used to
 * track user feedback or support requests.
 */

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm'; // Import TypeORM decorators

/**
 * Ticket class defining the structure of a ticket record in the database.
 * Includes fields for the ticket's ID, user ID, message, and creation date.
 */
@Entity('ticket') // Maps this entity to the 'ticket' table in the database
export class Ticket {
  /**
   * Primary key for the ticket, auto-incremented by the database.
   */
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * The ID of the user who submitted the ticket.
   * Must be unique to ensure only one active ticket per user.
   */
  @Column({ unique: true })
  userId: string;

  /**
   * The message or content of the ticket.
   * Cannot be null.
   */
  @Column({ nullable: false })
  message: string;

  /**
   * The date and time when the ticket was created.
   * Automatically set by the database on creation.
   */
  @CreateDateColumn()
  createdAt: Date;
}