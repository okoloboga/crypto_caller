/**
 * Entity representing a task in the RUBLE Farming App backend.
 * This entity maps to the 'tasks' table in the database and stores information about
 * price monitoring tasks, such as the currency pair, target price, and associated notifications.
 * It is used to track tasks created by users for monitoring cryptocurrency prices.
 */

import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm'; // Import TypeORM decorators
import { Notification } from '../notification/notification.entity'; // Import the Notification entity for relationship

/**
 * Task class defining the structure of a task record in the database.
 * Includes fields for the task's ID, currency pair, target price, direction of price trigger,
 * wallet address, creation and update timestamps, and associated notifications.
 */
@Entity('tasks') // Maps this entity to the 'tasks' table in the database
export class Task {
  /**
   * Primary key for the task, auto-incremented by the database.
   */
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * The currency pair to monitor (e.g., "BTC/USD").
   */
  @Column()
  currencyPair: string;

  /**
   * The target price to trigger the task, stored as a decimal.
   */
  @Column('decimal')
  targetPrice: number;

  /**
   * Indicates whether the task triggers when the price is above (true) or below (false) the target price.
   * Defaults to false (below).
   */
  @Column({ default: false })
  isPriceAbove: boolean;

  /**
   * The wallet address of the user who created the task.
   */
  @Column()
  walletAddress: string;

  /**
   * The date and time when the task was created.
   * Automatically set by the database on creation.
   */
  @CreateDateColumn()
  createdAt: Date;

  /**
   * The date and time when the task was last updated.
   * Automatically updated by the database on modification.
   */
  @UpdateDateColumn()
  updatedAt: Date;

  /**
   * The notifications associated with this task.
   * Establishes a one-to-many relationship with the Notification entity.
   */
  @OneToMany(() => Notification, (notification) => notification.task)
  notifications: Notification[];
}