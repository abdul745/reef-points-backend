import { Controller, Get, Query, Param } from '@nestjs/common';
import { PointsService } from './points.service';
import { evmToNativeAddress } from '../utils/address-converter';

@Controller('points')
export class PointsController {
  constructor(private readonly pointsService: PointsService) {}

  @Get('daily-total-points')
  async getDailyTotalPoints(
    @Query('userAddress') userAddress?: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    const result = await this.pointsService.getDailyTotalPoints(
      userAddress,
      parseInt(page),
      parseInt(limit),
    );

    // Convert EVM addresses to native Reef addresses
    result.data = result.data.map((item) => ({
      ...item,
      userAddress: evmToNativeAddress(item.userAddress),
    }));

    return result;
  }

  @Get('by-address/:userAddress')
  async getPointsByAddress(@Param('userAddress') userAddress: string) {
    const result = await this.pointsService.getPointsByAddress(userAddress);
    if (result) {
      return {
        ...result,
        userAddress: evmToNativeAddress(result.userAddress),
      };
    }
    return result;
  }

  @Get('leaderboard')
  async getLeaderboard(@Query('userAddress') userAddress?: string) {
    return this.pointsService.getLeaderboard(userAddress);
  }
}
