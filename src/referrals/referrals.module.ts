import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReferralsController } from './referrals.controller';
import { ReferralsService } from './referrals.service';
import { Referral } from './entities/referral.entity';
import { User } from '../users/entities/user.entity';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([Referral, User]), UsersModule],
  controllers: [ReferralsController],
  providers: [ReferralsService],
  exports: [ReferralsService],
})
export class ReferralsModule {}
