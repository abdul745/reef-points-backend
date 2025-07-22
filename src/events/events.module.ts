import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PointsModule } from 'src/points/points.module';
import { EventsService } from './events.service';
import { ProcessedEvent } from './entities/processed-event.entity';
import { PricesModule } from 'src/prices/prices.module';
import { LiquidityModule } from '../liquidity/liquidity.module';
import { HttpModule } from '@nestjs/axios';
import { SwapTransaction } from './entities/swap-transaction.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProcessedEvent, SwapTransaction]),
    HttpModule,
    PointsModule,
    PricesModule,
    LiquidityModule,
  ],
  providers: [EventsService],
})
export class EventsModule {}
