import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../user/user.entity';  // Импортируем User

@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.tasks)
  user: User;  // Связь с пользователем

  @Column({ default: false })
  isActive: boolean;  // Флаг активности подписки

  @Column({ nullable: true })
  expirationDate: Date;  // Дата окончания подписки

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}