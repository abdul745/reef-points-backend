import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EventsModule } from './events/events.module';
import { PointsModule } from './points/points.module';
import { ReferralsModule } from './referrals/referrals.module';
import { SettingsModule } from './settings/settings.module';
import { LiquidityModule } from './liquidity/liquidity.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { PricesModule } from './prices/prices.module';
import { UsersModule } from './users/users.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    CacheModule.register({
      isGlobal: true,
      ttl: parseInt(process.env.CACHE_TTL || '300'), // seconds
    }),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),
        autoLoadEntities: true,
        synchronize: true,
      }),
      inject: [ConfigService],
    }),
    EventsModule,
    PointsModule,
    ReferralsModule,
    SettingsModule,
    LiquidityModule,
    CampaignsModule,
    PricesModule,
    UsersModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
