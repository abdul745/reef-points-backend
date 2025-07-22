import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { LiquidityBalance } from './entities/liquidity-balance.entity';
import { PointsService } from '../points/points.service';
import { LiquidityService } from './liquidity.service';

@Injectable()
export class LiquidityScheduler {
  private readonly logger = new Logger(LiquidityScheduler.name);
  private isProcessing = false;

  constructor(
    private readonly liquidityService: LiquidityService,
    private readonly pointsService: PointsService,
    @InjectRepository(LiquidityBalance)
    private readonly liquidityBalanceRepository: Repository<LiquidityBalance>,
  ) {}

  /**
   * Daily job to calculate liquidity points.
   * Runs at 00:01 every day to calculate balances and points for the PREVIOUS day.
   */
  //       @Cron('0 1 * * *') // At 00:01 every day
  @Cron('*/2 * * * *') // Every 2 minutes
  async handleDailyLiquidityTasks() {
    if (this.isProcessing) {
      this.logger.warn('Daily liquidity tasks are already running. Skipping.');
      return;
    }
    this.isProcessing = true;

    try {
      const systemNow = new Date();
      this.logger.log(
        `[DEBUG] System now: ${systemNow.toISOString()} | ${systemNow.toLocaleString()}`,
      );
      const dateToProcess = new Date();
      dateToProcess.setDate(dateToProcess.getDate() - 1);
      this.logger.log(
        `[DEBUG] dateToProcess: ${dateToProcess.toISOString()} | ${dateToProcess.toLocaleString()}`,
      );
      const dateOnly = new Date(
        dateToProcess.getFullYear(),
        dateToProcess.getMonth(),
        dateToProcess.getDate(),
      );
      this.logger.log(
        `[DEBUG] dateOnly: ${dateOnly.toISOString()} | ${dateOnly.toLocaleString()} | LocalDate: ${dateOnly.toLocaleDateString()}`,
      );

      this.logger.log(
        `--- Starting daily liquidity tasks for ${dateOnly.toLocaleDateString()} (local) ---`,
      );

      // STEP 1: Calculate and save the lowest/final balances for the day for all relevant users.
      this.logger.log(`[1/2] Finding users for daily balance calculation...`);
      const usersToProcess =
        await this.liquidityService.getUsersForDailyCalculation(dateOnly);
      this.logger.log(`Found ${usersToProcess.length} users to process.`);

      for (const userAddress of usersToProcess) {
        try {
          // Resposible for calculating the lowest balance
          await this.liquidityService.calculateAndSaveDailyBalances(
            userAddress,
            dateOnly,
          );
        } catch (error) {
          this.logger.error(
            `Error calculating daily balance for user ${userAddress}:`,
            error,
          );
        }
      }
      this.logger.log(`[1/2] Daily balance calculation complete.`);

      // STEP 2: Now that balances are saved, calculate and award points.
      this.logger.log(`[2/2] Calculating and awarding liquidity points...`);
      for (const userAddress of usersToProcess) {
        try {
          // Responsible for awarding points after checking lowest balance
          await this.pointsService.updateDailyLiquidityPoints(
            userAddress,
            dateOnly,
          );
        } catch (error) {
          this.logger.error(
            `Error awarding liquidity points to user ${userAddress}:`,
            error,
          );
        }
      }
      this.logger.log(
        `[2/2] Liquidity points awarded for ${dateOnly.toLocaleDateString()} (local), UTC: ${dateOnly.toISOString()}`,
      );

      this.logger.log(
        `--- Daily liquidity tasks completed for ${dateOnly.toLocaleDateString()} (local) ---`,
      );
    } catch (error) {
      this.logger.error(
        'A critical error occurred in handleDailyLiquidityTasks:',
        error,
      );
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Clean up old liquidity balance records (older than 30 days)
   * Runs daily at 02:00
   */
  @Cron('0 2 * * *') // At 02:00 every day
  async cleanupOldLiquidityBalances() {
    try {
      this.logger.log('Starting cleanup of old liquidity balance records...');

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await this.liquidityBalanceRepository
        .createQueryBuilder()
        .delete()
        .where('date < :date', { date: thirtyDaysAgo })
        .execute();

      this.logger.log(
        `Cleaned up ${result.affected} old liquidity balance records`,
      );
    } catch (error) {
      this.logger.error('Error cleaning up old liquidity balances:', error);
    }
  }
}
