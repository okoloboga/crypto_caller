import { Controller, Post, Body, Delete, Param, ConflictException } from '@nestjs/common';
import { TicketService } from './tickets.service';
import { Ticket } from './tickets.entity';

@Controller('tickets')
export class TicketController {
    constructor(private readonly ticketService: TicketService) {}

    @Post()
    async createTicket(
        @Body('userId') userId: number,
        @Body('message') message: string,
    ): Promise<Ticket> {
        try {
            return await this.ticketService.createTicket(userId, message);
        } catch (error) {
            // Если возникла ошибка ConflictException, пробрасываем её дальше
            if (error instanceof ConflictException) {
                throw error;
            }
            // Обработка других ошибок, если необходимо
            throw error;
        }
    }

    @Delete(':id')
    async deleteTicket(@Param('id') id: number): Promise<void> {
        return this.ticketService.deleteTicket(id);
    }
}