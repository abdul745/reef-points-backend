import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { PointsService } from './points.service';

@Controller('points')
export class PointsController {
  constructor(private readonly pointsService: PointsService) {}

//   @Post('update-liquidity')
//   async updateLiquidityPoints(
//     @Body() body: { userAddress: string; poolType: string; amount: number; totalPools: number },
//   ) {
//     const { userAddress, poolType, amount, totalPools} = body;
//     const points = await this.pointsService.calculateLiquidityPoints(userAddress, poolType, amount, totalPools);
//     await this.pointsService.updatePoints(userAddress, points);
//     return { success: true, points };
//   }


@Post('update-liquidity')
async updateLiquidityPoints(
  @Body() body: { userAddress: string; poolType: string; amount: number; totalPools: number, depositDate: Date },
) {
  const { userAddress, poolType, amount, totalPools, depositDate } = body;
  await this.pointsService.updateLiquidityPoints(userAddress, poolType, amount, totalPools, depositDate);
  return { success: true }
}


// Imp: needs to be called on FE when user changes his balance so that depositDate and lowestBalance can be reset for user in the db. Which are being used to calculate points
  @Post('update-liquidity-data')
  async updateLowestBalance(
    @Body() body: { userAddress: string; amount: number; poolType: string },
  ) {
    await this.pointsService.updateLowestBalance(
      body.userAddress,
      body.amount,
      body.poolType,
    );
    return { success: true };
  }


@Post('update-swap')
async updateSwapPoints(@Body() body: { userAddress: string; feeGenerated: number, poolType: string, amount: number, depositDate: Date }) {
  const { userAddress, feeGenerated, poolType, amount, depositDate } = body;
  await this.pointsService.updateSwapPoints(userAddress, feeGenerated, poolType, amount, depositDate);
  return { success: true };
}


//   @Post('update-swap')
//   async updateSwapPoints(@Body() body: { userAddress: string; feeGenerated: number }) {
//     const { userAddress, feeGenerated } = body;
//     const points = this.pointsService.calculateSwapPoints(feeGenerated);
//     await this.pointsService.updatePoints(userAddress, points);
//     return { success: true, points };
//   }

// Instead use referral is being used
//   @Post('update-referral')
//   async updateReferralPoints(@Body() body: { referrerAddress: string; refereeAddress: string; refereePoints: number }) {
//     const { referrerAddress, refereeAddress, refereePoints } = body;
//     const { referrerPoints, refereeBonus } = this.pointsService.calculateReferralPoints(refereePoints);

//     await this.pointsService.updatePoints(referrerAddress, referrerPoints);
//     await this.pointsService.updatePoints(refereeAddress, refereeBonus);

//     return { success: true, referrerPoints, refereeBonus };
//   }

  // Get all points and addresses
  @Get('all')
  async getAllPoints() {
    return await this.pointsService.getAllPoints();
  }

  // Get points for a specific address
  @Get()
  async getPointsByAddress(@Query('userAddress') userAddress: string) {
    return await this.pointsService.getPointsByAddress(userAddress);
  }
}