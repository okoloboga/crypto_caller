import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketController } from './tickets.controller';
import { TicketService } from './tickets.service';
import { Ticket } from './tickets.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Ticket])],
    controllers: [TicketController],
    providers: [TicketService],
})
export class TicketModule {}