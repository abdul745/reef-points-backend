import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { LiquidityService } from '../liquidity/liquidity.service';
import { AdminAuthGuard } from '../admin/admin-auth.guard';

interface CampaignEligibilityUpdate {
  bootstrappingEligible?: boolean;
  earlySznEligible?: boolean;
  memeSznEligible?: boolean;
}

interface BulkCampaignEligibilityUpdate {
  poolAddress: string;
  bootstrappingEligible?: boolean;
  earlySznEligible?: boolean;
  memeSznEligible?: boolean;
}

@Controller('campaigns')
@UseGuards(AdminAuthGuard)
export class CampaignsController {
  constructor(private readonly liquidityService: LiquidityService) {}

  @Get('pools')
  async getAllPools() {
    return this.liquidityService.getAllPools();
  }

  @Patch('pools/:poolAddress/eligibility')
  async updateCampaignEligibility(
    @Param('poolAddress') poolAddress: string,
    @Body() eligibility: CampaignEligibilityUpdate,
  ) {
    return this.liquidityService.updatePoolCampaignEligibility(
      poolAddress,
      eligibility,
    );
  }

  @Post('pools/bulk-eligibility')
  async updateBulkCampaignEligibility(
    @Body() updates: BulkCampaignEligibilityUpdate[],
  ) {
    return this.liquidityService.updateBulkCampaignEligibility(updates);
  }

  @Get('eligible-pools')
  async getEligiblePools() {
    return this.liquidityService.getEligiblePools();
  }

  @Get('analytics')
  async getCampaignAnalytics() {
    return this.liquidityService.getCampaignAnalytics();
  }
}
