import { Module } from '@nestjs/common';
import { CampaignsController } from './campaigns.controller';
import { LiquidityModule } from '../liquidity/liquidity.module';
import { AdminModule } from '../admin/admin.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [LiquidityModule, AdminModule, AuthModule],
  controllers: [CampaignsController],
})
export class CampaignsModule {}
