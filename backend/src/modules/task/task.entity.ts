import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Notification } from '../notification/notification.entity';

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  currencyPair: string;

  @Column({ default: true })
  isActive: boolean;

  @Column('decimal')
  targetPrice: number;

  @Column({ default: false })
  isPriceAbove: boolean;

  @Column()
  walletAddress: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Notification, (notification) => notification.task)
  notifications: Notification[];
}
