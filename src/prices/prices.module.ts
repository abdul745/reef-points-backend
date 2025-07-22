import { Module } from '@nestjs/common';
import { PriceService } from './prices.service';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [HttpModule, ConfigModule],
  providers: [PriceService],
  exports: [PriceService],
})
export class PricesModule {}
