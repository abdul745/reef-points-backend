import { Controller, Post, UseGuards } from '@nestjs/common';
import { EventsService } from './events.service';
import { AdminAuthGuard } from '../admin/admin-auth.guard';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post('test-historical-data')
  @UseGuards(AdminAuthGuard)
  async testHistoricalData() {
    await this.eventsService.testWithHistoricalData();
    return {
      message: 'Historical data testing started. Check logs for progress.',
      status: 'started',
    };
  }
}
