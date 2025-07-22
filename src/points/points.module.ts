import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PointsService } from './points.service';
import { PointsController } from './points.controller';
import { UserPoints } from './entities/user-points.entity';
import { SettingsModule } from 'src/settings/settings.module';
import { LiquidityModule } from '../liquidity/liquidity.module';
import { UsersModule } from '../users/users.module';
import { ReferralsModule } from 'src/referrals/referrals.module';
import { Referral } from 'src/referrals/entities/referral.entity';
import { User } from 'src/users/entities/user.entity';
import { SwapTransaction } from '../events/entities/swap-transaction.entity';
import { PoolConfig } from '../liquidity/entities/pool-config.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserPoints,
      User,
      Referral,
      SwapTransaction,
      PoolConfig,
    ]),
    SettingsModule,
    UsersModule,
    ReferralsModule,
    forwardRef(() => LiquidityModule),
  ],
  controllers: [PointsController],
  providers: [PointsService],
  exports: [PointsService],
})
export class PointsModule {}
