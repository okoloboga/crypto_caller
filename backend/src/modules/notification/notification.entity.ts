import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../user/user.entity';
import { Task } from '../task/task.entity';

@Entity()
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  phoneNumber: string;

  @Column()
  status: string;  // Статус уведомления, например "initiated", "completed", "failed"

  @Column()
  createdAt: Date;

  @ManyToOne(() => User, (user) => user.notifications)
  @JoinColumn({ name: 'addressWallet' })
  user: User;

  @ManyToOne(() => Task, (task) => task.notifications)
  @JoinColumn({ name: 'taskId' })
  task: Task;

  constructor(phoneNumber: string, status: string, user: User, task: Task) {
    this.phoneNumber = phoneNumber;
    this.status = status;
    this.createdAt = new Date();
    this.user = user;
    this.task = task;
  }
}