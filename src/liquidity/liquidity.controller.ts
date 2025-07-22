import { Controller, Post, Get, Body, Param, Query } from '@nestjs/common';
import { LiquidityService } from './liquidity.service';
import { PointsService } from '../points/points.service';

@Controller('liquidity')
export class LiquidityController {
  constructor(
    private readonly liquidityService: LiquidityService,
    private readonly pointsService: PointsService,
  ) {}

  @Post('test-points-calculation')
  async testPointsCalculation(
    @Body() body: { userAddress: string; date?: string },
  ) {
    const date = body.date ? new Date(body.date) : new Date();
    const dateOnly = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    );

    console.log(
      `🧪 Manual test: Calculating liquidity points for ${body.userAddress} on ${dateOnly.toLocaleDateString()} (local), UTC: ${dateOnly.toISOString()}`,
    );

    // Calculate points
    const points = await this.liquidityService.calculateDailyLiquidityPoints(
      body.userAddress,
      dateOnly,
    );

    // Update user points
    await this.pointsService.updateDailyLiquidityPoints(
      body.userAddress,
      dateOnly,
    );

    return {
      success: true,
      userAddress: body.userAddress,
      date: dateOnly.toISOString().split('T')[0],
      calculatedPoints: points,
      message: 'Liquidity points calculated and updated successfully',
    };
  }

  @Get('user-balances/:userAddress')
  async getUserBalances(
    @Param('userAddress') userAddress: string,
    @Query('date') date?: string,
  ) {
    const targetDate = date ? new Date(date) : new Date();
    const dateOnly = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate(),
    );

    const balances = await this.liquidityService.getUserActivePools(
      userAddress,
      dateOnly,
    );
    const lowestBalance = await this.liquidityService.getLowestBalanceForDate(
      userAddress,
      dateOnly,
    );

    return {
      userAddress,
      date: dateOnly.toISOString().split('T')[0],
      activePools: balances,
      lowestBalanceUSD: lowestBalance,
      poolCount: balances.length,
    };
  }

  @Post('simulate-liquidity')
  async simulateLiquidity(
    @Body()
    body: {
      userAddress: string;
      poolAddress: string;
      token0Address: string;
      token1Address: string;
      amount0: number;
      amount1: number;
      date?: string;
    },
  ) {
    const date = body.date ? new Date(body.date) : new Date();
    const dateOnly = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    );

    console.log(
      `🧪 Manual test: Simulating liquidity for ${body.userAddress} in pool ${body.poolAddress} on ${dateOnly.toLocaleDateString()} (local), UTC: ${dateOnly.toISOString()}`,
    );

    // Update liquidity balance
    await this.liquidityService.updateLiquidityBalance(
      body.userAddress,
      body.poolAddress,
      body.token0Address,
      body.token1Address,
      body.amount0,
      body.amount1,
      dateOnly,
    );

    return {
      success: true,
      message: 'Liquidity balance updated successfully',
      data: {
        userAddress: body.userAddress,
        poolAddress: body.poolAddress,
        amount0: body.amount0,
        amount1: body.amount1,
        date: dateOnly.toISOString().split('T')[0],
      },
    };
  }
}
