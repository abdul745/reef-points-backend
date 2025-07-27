import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserPoints } from './entities/user-points.entity';
import { SettingsService } from 'src/settings/settings.service';
import { Referral } from 'src/referrals/entities/referral.entity';
import { LiquidityService } from '../liquidity/liquidity.service';
import { User } from 'src/users/entities/user.entity';
import { SwapTransaction } from 'src/events/entities/swap-transaction.entity';
import {
  PoolConfig,
  PoolType,
} from 'src/liquidity/entities/pool-config.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MoreThan } from 'typeorm';

@Injectable()
export class PointsService {
  constructor(
    @InjectRepository(UserPoints)
    private readonly pointsRepository: Repository<UserPoints>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Referral)
    private readonly referralRepository: Repository<Referral>,
    private readonly settingsService: SettingsService,
    @Inject(forwardRef(() => LiquidityService))
    private readonly liquidityService: LiquidityService,
    @InjectRepository(SwapTransaction)
    private readonly swapTransactionRepository: Repository<SwapTransaction>,
    @InjectRepository(PoolConfig)
    private readonly poolConfigRepository: Repository<PoolConfig>,
  ) {}

  // Remove updateLiquidityPoints and calculateLiquidityPoints methods and any private helpers only used by them

  private async applyReferralBonuses(
    userAddress: string,
    points: number,
  ): Promise<void> {
    // Find the user and their referral relationship
    const user = await this.userRepository.findOne({
      where: { address: userAddress },
      relations: ['referredBy', 'referredBy.referrer'],
    });
    if (user && user.referredBy && user.referredBy.referrer) {
      const referrer = user.referredBy.referrer;
      const referrerBonus =
        points *
        (parseInt(process.env.REFERRER_BONUS_PERCENTAGE || '10') / 100);
      const refereeBonus =
        points * (parseInt(process.env.REFERRAL_BONUS_PERCENTAGE || '5') / 100);
      // Award 10% to referrer
      await this.updateReferralPoints(referrer.address, referrerBonus);
      // Award 5% to referee (the user themselves)
      await this.updateReferralPoints(userAddress, refereeBonus);
      console.log(
        `[ReferralBonus] Awarded ${referrerBonus} to referrer (${referrer.address}), ${refereeBonus} to referee (${userAddress})`,
      );
    }
  }

  private async updateReferralPoints(
    userAddress: string,
    points: number,
  ): Promise<void> {
    const user = await this.pointsRepository.findOne({
      where: { userAddress },
    });

    if (user) {
      user.referralPoints += points;
      await this.pointsRepository.save(user);
    } else {
      const newUser = this.pointsRepository.create({
        userAddress,
        referralPoints: points,
      });
      await this.pointsRepository.save(newUser);
    }
  }
  // Resetting the lowestBalance to 0 at the end of the day would cause issues in scenarios where a user has liquidity but doesn't perform any transactions the next day. This would incorrectly reflect their lowestBalance as 0, even though they are still providing liquidity.
  async resetLowestBalances(): Promise<void> {
    const users = await this.pointsRepository.find();

    for (const user of users) {
      // Carry over the current balance as the new lowest balance for the next day
      user.lowestBalance = user.currentBalance;
      await this.pointsRepository.save(user);
    }

    console.log('Carried over lowest balances for all users.');
  }

  async getPointsByAddress(userAddress: string): Promise<UserPoints | null> {
    return this.pointsRepository.findOne({ where: { userAddress } });
  }

  /**
   * Refactored: Calculate daily liquidity points for a user by fetching pool type from pool_config for each pool
   */
  async updateDailyLiquidityPoints(
    userAddress: string,
    date: Date,
  ): Promise<void> {
    // Get all lowest balances for the user for the day (only above $1 threshold)
    const lowestBalances =
      await this.liquidityService.liquidityBalanceRepository.find({
        where: { userAddress, date, valueUSD: MoreThan(1) }, // Only consider balances above $1
      });

    if (lowestBalances.length === 0) {
      console.log(
        `[PointsService] No balances above $1 threshold for user ${userAddress} on ${date.toISOString().split('T')[0]}`,
      );
      return;
    }

    console.log(
      `[PointsService] Processing ${lowestBalances.length} balances above $1 threshold for user ${userAddress}`,
    );

    let totalPoints = 0;
    const perPoolPoints: { poolAddress: string; points: number }[] = [];

    for (const balance of lowestBalances) {
      const poolConfig = await this.poolConfigRepository.findOne({
        where: { poolAddress: balance.poolAddress },
      });
      if (!poolConfig) continue;
      let multiplier = 1;
      switch (poolConfig.poolType) {
        case PoolType.STABLE_STABLE:
          multiplier = parseInt(process.env.STABLE_STABLE_MULTIPLIER || '1');
          break;
        case PoolType.VOLATILE_VOLATILE:
          multiplier = parseInt(
            process.env.VOLATILE_VOLATILE_MULTIPLIER || '4',
          );
          break;
        case PoolType.VOLATILE_STABLE:
          multiplier = parseInt(process.env.VOLATILE_STABLE_MULTIPLIER || '7');
          break;
      }
      // Fetch duration multiplier from streakStartDate
      const streakStartDate = balance.streakStartDate || balance.date;

      const daysHeld = Math.floor(
        (date.getTime() - new Date(streakStartDate).getTime()) /
          (1000 * 60 * 60 * 24),
      );
      const durationMultiplier =
        this.liquidityService.getDurationMultiplierFromStreak(
          new Date(streakStartDate),
          date,
        );
      const points = balance.valueUSD * multiplier * durationMultiplier;
      perPoolPoints.push({ poolAddress: balance.poolAddress, points });
      totalPoints += points;
      // Save per-pool points for analytics (optional, can be kept as is)
      let userPoints = await this.pointsRepository.findOne({
        where: { userAddress, poolAddress: balance.poolAddress, date },
      });
      if (!userPoints) {
        userPoints = this.pointsRepository.create({
          userAddress,
          poolAddress: balance.poolAddress,
          date,
          actionPoints: 0,
          poolType: poolConfig.poolType,
        });
      }
      userPoints.actionPoints = points;
      userPoints.poolType = poolConfig.poolType;
      await this.pointsRepository.save(userPoints);
      console.log(
        `[PointsService] Awarded ${points} points for pool ${balance.poolAddress} (balance: $${balance.valueUSD}, streakStartDate: ${streakStartDate}, daysHeld: ${daysHeld}, duration multiplier: ${durationMultiplier})`,
      );
    }

    // Apply pool multiplier to total points (up to 4)
    const poolMultiplier = Math.min(lowestBalances.length, 4);
    let multipliedPoints = totalPoints * poolMultiplier;
    // Fetch campaign multiplier
    const settings = await this.settingsService.getSettings();
    const campaignMultiplier =
      this.settingsService.getCombinedCampaignMultiplier(settings, date);
    multipliedPoints = multipliedPoints * campaignMultiplier;
    console.log(
      `[PointsService] User ${userAddress} total points before multiplier: ${totalPoints}, pool multiplier: ${poolMultiplier}, campaign multiplier: ${campaignMultiplier}, after all multipliers: ${multipliedPoints}`,
    );

    // Save/update a summary row for the user for the day (e.g., poolAddress = 'ALL', or similar)
    let summaryPoints = await this.pointsRepository.findOne({
      where: { userAddress, poolAddress: 'ALL', date },
    });
    if (!summaryPoints) {
      summaryPoints = this.pointsRepository.create({
        userAddress,
        poolAddress: 'ALL',
        date,
        actionPoints: 0,
        poolType: 'SUMMARY',
      });
    }
    summaryPoints.actionPoints = multipliedPoints;
    summaryPoints.poolType = 'SUMMARY';
    await this.pointsRepository.save(summaryPoints);
    console.log(
      `[PointsService] Saved summary points for user ${userAddress} on ${date.toLocaleString()} (UTC: ${date.toISOString()})`,
    );
    // Apply referral bonuses for liquidity points
    await this.applyReferralBonuses(userAddress, multipliedPoints);
  }

  async getReferralByAddress(userAddress: string): Promise<Referral | null> {
    const user = await this.userRepository.findOne({
      where: { address: userAddress },
      relations: ['referredBy', 'referredBy.referrer'],
    });

    return user && user.referredBy ? user.referredBy : null;
  }

  /**
   * Scheduled job to batch-calculate and award swap points for all users and pools at the end of each day
   */
  //   @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  // todo: uncomment
  //   @Cron('*/2 * * * *')
  async calculateAndAwardDailySwapPoints() {
    const dateToProcess = new Date();
    // toDo: Change the date and the scheduler time after testing
    dateToProcess.setDate(dateToProcess.getDate());
    //     dateToProcess.setDate(dateToProcess.getDate());
    const dateOnly = new Date(
      dateToProcess.getFullYear(),
      dateToProcess.getMonth(),
      dateToProcess.getDate(),
    );

    // Get all swap transactions for the day
    const swaps = await this.swapTransactionRepository.find({
      where: { date: dateOnly },
    });
    console.log(
      `[SwapPoints] Processing swaps for date: ${dateOnly.toISOString().split('T')[0]}`,
    );
    console.log(
      `[SwapPoints] Found ${swaps.length} swap transactions for the day.`,
    );
    if (swaps.length === 0) return;

    // Group by user and pool
    const userPoolMap = new Map<
      string,
      { userAddress: string; poolAddress: string; totalUSD: number }
    >();
    for (const swap of swaps) {
      const key = `${swap.userAddress}_${swap.poolAddress}`;
      if (!userPoolMap.has(key)) {
        userPoolMap.set(key, {
          userAddress: swap.userAddress,
          poolAddress: swap.poolAddress,
          totalUSD: 0,
        });
      }
      userPoolMap.get(key)!.totalUSD += Number(swap.valueUSD);
    }
    console.log(
      `[SwapPoints] Grouped into ${userPoolMap.size} user/pool pairs.`,
    );

    for (const { userAddress, poolAddress, totalUSD } of userPoolMap.values()) {
      // Get pool type
      const poolConfig = await this.poolConfigRepository.findOne({
        where: { poolAddress },
      });
      if (!poolConfig) {
        console.log(
          `[SwapPoints] No poolConfig found for pool ${poolAddress}, skipping.`,
        );
        continue;
      }

      // Calculate points based on fees generated
      const feeRate = parseFloat(process.env.SWAP_FEE_RATE || '0.001'); // 0.1% fee rate
      const feeGenerated = totalUSD * feeRate;
      const points =
        feeGenerated * parseInt(process.env.POINTS_PER_DOLLAR_FEE || '200'); // points per $1 fee

      // Update user_points for this user/pool/day
      let userPoints = await this.pointsRepository.findOne({
        where: { userAddress, poolAddress, date: dateOnly },
      });
      if (!userPoints) {
        userPoints = this.pointsRepository.create({
          userAddress,
          poolAddress,
          date: dateOnly,
          actionPoints: 0,
          poolType: poolConfig.poolType,
        });
      }
      userPoints.actionPoints += points;
      userPoints.poolType = poolConfig.poolType;
      await this.pointsRepository.save(userPoints);
      // Apply referral bonuses for swap points
      await this.applyReferralBonuses(userAddress, points);
      console.log(
        `[SwapPoints] Awarded ${points} points to ${userAddress} for pool ${poolAddress} (fee: $${feeGenerated}) on ${dateOnly.toISOString().split('T')[0]}`,
      );
    }
  }

  async getDailyTotalPoints(userAddress?: string) {
    const qb = this.pointsRepository
      .createQueryBuilder('points')
      .select('points.userAddress', 'userAddress')
      .addSelect('points.date', 'date')
      .addSelect('SUM(points.actionPoints)', 'totalActionPoints')
      .addSelect('SUM(points.referralPoints)', 'totalReferralPoints')
      .where('points.poolAddress != :all', { all: 'ALL' });

    if (userAddress) {
      qb.andWhere('points.userAddress = :userAddress', { userAddress });
    }

    const results = await qb
      .groupBy('points.userAddress')
      .addGroupBy('points.date')
      .orderBy('points.userAddress', 'ASC')
      .addOrderBy('points.date', 'DESC')
      .getRawMany();

    // Add total column
    const withTotal = results.map((row) => ({
      ...row,
      total: Number(row.totalActionPoints) + Number(row.totalReferralPoints),
    }));

    // If querying for all users, add rank by total (descending)
    if (!userAddress) {
      withTotal.sort((a, b) => b.total - a.total);
      withTotal.forEach((row, idx) => {
        row.rank = idx + 1;
      });
    }

    return withTotal;
  }
}
