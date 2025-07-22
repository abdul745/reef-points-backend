import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { PointsService } from './points.service';

@Controller('points')
export class PointsController {
  constructor(private readonly pointsService: PointsService) {}

  // Get points for a specific address
  @Get()
  async getPointsByAddress(@Query('userAddress') userAddress: string) {
    return await this.pointsService.getPointsByAddress(userAddress);
  }

  @Get('daily-total-points')
  async getDailyTotalPoints(@Query('userAddress') userAddress?: string) {
    return await this.pointsService.getDailyTotalPoints(userAddress);
  }
}
