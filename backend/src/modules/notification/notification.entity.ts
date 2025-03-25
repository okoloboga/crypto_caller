/**
 * Entity representing a notification in the RUBLE Farming App backend.
 * This entity maps to a database table and stores information about notifications,
 * such as the phone number, status, creation date, and relationships to the associated user and task.
 * It is used to track notifications (e.g., phone calls) sent for tasks.
 */

import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm'; // Import TypeORM decorators
import { User } from '../user/user.entity'; // Import the User entity for relationship
import { Task } from '../task/task.entity'; // Import the Task entity for relationship

/**
 * Notification class defining the structure of a notification record in the database.
 * Includes fields for the notification's ID, phone number, status, creation date,
 * and relationships to the user and task.
 */
@Entity() // Marks this class as a TypeORM entity, mapping to a database table
export class Notification {
  /**
   * Primary key for the notification, auto-incremented by the database.
   */
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * The phone number to which the notification (e.g., a phone call) is sent.
   */
  @Column()
  phoneNumber: string;

  /**
   * The status of the notification.
   * Possible values include "initiated", "completed", or "failed".
   */
  @Column()
  status: string; // Status of the notification, e.g., "initiated", "completed", "failed"

  /**
   * The date and time when the notification was created.
   */
  @Column()
  createdAt: Date;

  /**
   * The user associated with this notification.
   * Establishes a many-to-one relationship with the User entity.
   */
  @ManyToOne(() => User, (user) => user.notifications) // Many notifications belong to one user
  @JoinColumn({ name: 'addressWallet' }) // Foreign key column in the database
  user: User;

  /**
   * The task associated with this notification.
   * Establishes a many-to-one relationship with the Task entity.
   */
  @ManyToOne(() => Task, (task) => task.notifications) // Many notifications belong to one task
  @JoinColumn({ name: 'taskId' }) // Foreign key column in the database
  task: Task;

  /**
   * Constructor to initialize a new Notification instance.
   * @param phoneNumber - The phone number for the notification.
   * @param status - The initial status of the notification.
   * @param user - The user associated with the notification.
   * @param task - The task associated with the notification.
   */
  constructor(phoneNumber: string, status: string, user: User, task: Task) {
    this.phoneNumber = phoneNumber;
    this.status = status;
    this.createdAt = new Date(); // Set the creation date to the current time
    this.user = user;
    this.task = task;
  }
}