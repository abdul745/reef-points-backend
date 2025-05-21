import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PointsModule } from './points/points.module';
import { UserPoints } from './points/entities/user-points.entity';
import { ReferralModule } from './referrals/referrals.module';
import { Referral } from './referrals/entities/referral.entity';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ScheduleModule } from '@nestjs/schedule';
import { SettingsModule } from './settings/settings.module';

@Module({
  imports: [
    ScheduleModule.forRoot(), 
    TypeOrmModule.forRoot({
      type: 'postgres', // Database type
      host: 'localhost', // Database host
      port: 5432, // Default PostgreSQL port
      username: 'macbookpro', // Your PostgreSQL username
      password: '', // Your PostgreSQL password
      database: 'reefswap', // Your database name
      autoLoadEntities: true,
      entities: [UserPoints, Referral], // Register your entities here
      synchronize: true, // Automatically sync database schema (disable in production)
    }),
    PointsModule,
    ReferralModule,
    AuthModule, 
    UsersModule,
    SettingsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
