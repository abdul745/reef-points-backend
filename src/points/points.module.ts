import { Module } from '@nestjs/common';
import { PointsService } from './points.service';
import { PointsController } from './points.controller';
import { UserPoints } from './entities/user-points.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PointsScheduler } from './points.scheduler';
import { SettingsModule } from 'src/settings/settings.module';
import { Referral } from 'src/referrals/entities/referral.entity';

@Module({
 imports: [TypeOrmModule.forFeature([UserPoints, Referral]),
SettingsModule,
],
  providers: [PointsService, PointsScheduler],
  controllers: [PointsController],
exports: [PointsService],
})
export class PointsModule {}
