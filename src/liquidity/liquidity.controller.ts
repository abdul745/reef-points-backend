import { Controller, Get, UseGuards } from '@nestjs/common';
import { LiquidityService } from './liquidity.service';
import { AdminAuthGuard } from '../admin/admin-auth.guard';

@Controller('liquidity')
@UseGuards(AdminAuthGuard)
export class LiquidityController {
  constructor(private readonly liquidityService: LiquidityService) {}

  @Get('pools')
  async getAllPools() {
    return this.liquidityService.getAllPools();
  }
}
