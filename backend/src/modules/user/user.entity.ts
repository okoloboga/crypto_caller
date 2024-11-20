// src/user/user.entity.ts

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Task } from '../task/task.entity';
import { Notification } from '../notification/notification.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  phoneNumber: string;

  @Column({ unique: true })
  walletAddress: string;

  @Column({ default: 'inactive' })
  subscriptionStatus: string; // 'active' or 'inactive'

  @Column({ default: 0 })
  points: number;

  @Column({ type: 'timestamp', nullable: true })
  lastPointsCollectedAt: Date;

  @OneToMany(() => Task, (task) => task.user)
  tasks: Task[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Notification, (notification) => notification.user)
  notifications: Notification[];
};

