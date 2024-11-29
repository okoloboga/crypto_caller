// src/user/user.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Notification } from '../notification/notification.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  phoneNumber: string;

  @Column({ unique: true })
  walletAddress: string;

  @Column({ type: 'timestamp', nullable: true })
  subscriptionDate: Date;

  @Column({ type: 'float', default: 0 })
  points: number;  

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', nullable: true })
  lastUpdated: Date;

  @Column('int', { array: true, nullable: true })
  taskIds: number[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Notification, (notification) => notification.user)
  notifications: Notification[];
}
