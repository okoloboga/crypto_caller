import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm'

@Entity('ticket')
export class Ticket {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    userId: number;

    @Column({ nullable: false })
    message: string;

    @CreateDateColumn()
    createdAt: Date;
}