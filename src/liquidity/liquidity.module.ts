import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LiquidityService } from './liquidity.service';
import { LiquidityScheduler } from './liquidity.scheduler';
import { LiquidityBalance } from './entities/liquidity-balance.entity';
import { PoolConfig } from './entities/pool-config.entity';
import { LiquidityTransaction } from './entities/liquidity-transaction.entity';
import { PricesModule } from '../prices/prices.module';
import { PointsModule } from '../points/points.module';
import { SettingsModule } from '../settings/settings.module';
import { UserLiquidity } from './entities/user-liquidity.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LiquidityBalance,
      PoolConfig,
      LiquidityTransaction,
      UserLiquidity,
    ]),
    PricesModule,
    forwardRef(() => PointsModule),
    SettingsModule,
  ],
  providers: [LiquidityService, LiquidityScheduler],
  exports: [LiquidityService],
})
export class LiquidityModule {}
 