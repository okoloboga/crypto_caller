import { Controller, Post, Body, Delete, ConflictException } from '@nestjs/common';
import { TicketService } from './tickets.service';
import { Ticket } from './tickets.entity';

@Controller('tickets')
export class TicketController {
    constructor(private readonly ticketService: TicketService) {}

    @Post()
    async createTicket(
        @Body('userId') userId: string,
        @Body('message') message: string,
    ): Promise<Ticket> {
        try {
            return await this.ticketService.createTicket(userId, message);
        } catch (error) {
            if (error instanceof ConflictException) {
                throw error;
            }
            throw error;
        }
    }

    @Delete()
    async deleteTicket(
        @Body('userId') userId: string
    ): Promise<Ticket> {
        try {
            return await this.ticketService.deleteTicket(userId);
        } catch (error) {
            if (error instanceof ConflictException) {
                throw error;
            }
            throw error;
        }
    }
}