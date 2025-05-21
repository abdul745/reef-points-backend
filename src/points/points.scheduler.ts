import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PointsService } from './points.service';

@Injectable()
export class PointsScheduler {
  constructor(private readonly pointsService: PointsService) {}

  @Cron('0 0 * * *') // Runs daily at 00:00 UTC
  // @Cron('* * * * *') // Runs every minute (For testing)
  async carryOverLowestBalances() {
    console.log('Carrying over lowest balances for all users...');
    await this.pointsService.resetLowestBalances();
    console.log('Lowest balances carried over.');
  }
}
