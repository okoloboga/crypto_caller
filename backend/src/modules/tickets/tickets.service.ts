import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket } from './tickets.entity';

@Injectable()
export class TicketService {
    constructor(
        @InjectRepository(Ticket)
        private readonly ticketRepository: Repository<Ticket>,
    ) {}

    async createTicket(userId: string, message: string): Promise<Ticket> {
        // Проверяем, существует ли уже запись с таким userId
        const existingTicket = await this.ticketRepository.findOne({ where: { userId } });

        if (existingTicket) {
            // Если запись уже существует, выбрасываем ошибку
            throw new ConflictException(`Ticket with userId ${userId} already exists`);
        }

        // Если записи нет, создаем новую
        const ticket = this.ticketRepository.create({ userId, message });
        return await this.ticketRepository.save(ticket);
    }

    async deleteTicket(id: number): Promise<void> {
        await this.ticketRepository.delete(id);
    }
}