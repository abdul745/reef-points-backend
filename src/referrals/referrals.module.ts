import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Referral } from './entities/referral.entity';
import { PointsModule } from '../points/points.module';
import { ReferralController } from './referrals.controller';
import { ReferralService } from './referrals.service';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Referral]), PointsModule, AuthModule],
  controllers: [ReferralController],
  providers: [ReferralService],
exports: [TypeOrmModule],
})
export class ReferralModule {}