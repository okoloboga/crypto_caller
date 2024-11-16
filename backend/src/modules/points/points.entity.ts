import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { User } from '../user/user.entity';

@Entity()
export class Point {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  points: number;

  @Column()
  lastCollectedAt: Date;

  @ManyToOne(() => User, (user) => user.points, { eager: true })
  user: User;
}