import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PointsModule } from 'src/points/points.module';
import { EventsService } from './events.service';
import { ProcessedEvent } from './entities/processed-event.entity';
import { PricesModule } from 'src/prices/prices.module';
import { LiquidityModule } from '../liquidity/liquidity.module';
import { HttpModule } from '@nestjs/axios';
import { SwapTransaction } from './entities/swap-transaction.entity';
import { AdminModule } from '../admin/admin.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProcessedEvent, SwapTransaction]),
    HttpModule,
    PointsModule,
    PricesModule,
    LiquidityModule,
    AdminModule,
    AuthModule,
  ],
  providers: [EventsService],
})
export class EventsModule {}
