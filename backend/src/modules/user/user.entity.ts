/**
 * Entity representing a user in the RUBLE Farming App backend.
 * This entity maps to the 'users' table in the database and stores information about
 * users, including their wallet address, phone number, subscription details, points,
 * task associations, and notifications. It is used to manage user data and their interactions
 * with the app (e.g., price monitoring tasks, notifications).
 */

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm'; // Import TypeORM decorators
import { Notification } from '../notification/notification.entity'; // Import the Notification entity for relationship

/**
 * User class defining the structure of a user record in the database.
 * Includes fields for the user's ID, phone number, wallet address, subscription date,
 * points, task IDs, timestamps, and associated notifications.
 */
@Entity('users') // Maps this entity to the 'users' table in the database
export class User {
  /**
   * Primary key for the user, auto-incremented by the database.
   */
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * The user's phone number, used for notifications (e.g., price alerts).
   * Can be null if not provided.
   */
  @Column({ nullable: true })
  phoneNumber: string;

  /**
   * The user's wallet address, used as a unique identifier.
   * Must be unique to prevent duplicate users.
   */
  @Column({ unique: true })
  walletAddress: string;

  /**
   * The date and time when the user subscribed (e.g., associated a phone number).
   * Can be null if the user has not subscribed.
   */
  @Column({ type: 'timestamp', nullable: true })
  subscriptionDate: Date;

  /**
   * The user's total accumulated points.
   * Defaults to 0.
   */
  @Column({ type: 'float', default: 0 })
  points: number;

  /**
   * The user's last updated points value (e.g., points at the last update).
   * Defaults to 0.
   */
  @Column({ type: 'float', default: 0 })
  lastPoints: number;

  /**
   * The date and time when the user's points were last updated.
   * Defaults to the current timestamp.
   */
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', nullable: true })
  lastUpdated: Date;

  /**
   * An array of task IDs associated with the user (e.g., price monitoring tasks).
   * Can be null if the user has no tasks.
   */
  @Column('int', { array: true, nullable: true })
  taskIds: number[];

  /**
   * The date and time when the user record was created.
   * Automatically set by the database on creation.
   */
  @CreateDateColumn()
  createdAt: Date;

  /**
   * The date and time when the user record was last updated.
   * Automatically updated by the database on modification.
   */
  @UpdateDateColumn()
  updatedAt: Date;

  /**
   * The notifications associated with this user.
   * Establishes a one-to-many relationship with the Notification entity.
   */
  @OneToMany(() => Notification, (notification) => notification.user)
  notifications: Notification[];
}