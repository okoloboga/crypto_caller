import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../user/user.entity';
import { Notification } from '../notification/notification.entity';

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  pair: string; // e.g., 'BTC/USDT'

  @Column({ default: true })
  isActive: boolean

  @Column('decimal')
  targetPrice: number;

  @Column({ default: false })
  isPriceAbove: boolean;

  @ManyToOne(() => User, (user) => user.tasks, { onDelete: 'CASCADE' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Notification, (notification) => notification.task)
  notifications: Notification[];
}