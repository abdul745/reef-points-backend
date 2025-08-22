import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserPoints } from './entities/user-points.entity';
import { SettingsService } from 'src/settings/settings.service';
import { Settings } from 'src/settings/entities/settings.entity';
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
import { CONFIG } from '../config/constants';

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

  //   private async applyReferralBonuses(
  //     userAddress: string,
  //     points: number,
  //   ): Promise<void> {
  //     // Find the user and their referral relationship
  // console.log("inside the applyReferralBonuses");
  //     const user = await this.userRepository.findOne({
  //       where: { address: userAddress },
  //       relations: ['referredBy', 'referredBy.referrer'],
  //     });

  // console.log("user found in applyReferralBonuses", user);

  //     if (user && user.referredBy && user.referredBy.referrer) {
  //       const referrer = user.referredBy.referrer;
  //       const referrerBonus = points * (CONFIG.REFERRER_BONUS_PERCENTAGE / 100);
  //       const refereeBonus = points * (CONFIG.REFERRAL_BONUS_PERCENTAGE / 100);
  //       // Award 10% to referrer
  //       await this.updateReferralPoints(referrer.address, referrerBonus);
  //       // Award 5% to referee (the user themselves)
  //       await this.updateReferralPoints(userAddress, refereeBonus);
  //       console.log(
  //         `[ReferralBonus] Awarded ${referrerBonus} to referrer (${referrer.address}), ${refereeBonus} to referee (${userAddress})`,
  //       );
  //     }
  //   }

  private async applyReferralBonuses(
    userAddress: string,
    points: number,
  ): Promise<void> {
    console.log('inside the applyReferralBonuses');
    console.log(
      `Processing referral bonuses for userAddress: ${userAddress}, points: ${points}`,
    );

    // Find the user and their referral relationship
    const user = await this.userRepository.findOne({
      where: { address: userAddress.toLowerCase() },
      relations: ['referredBy', 'referredBy.referrer'],
    });

    console.log('User fetched from database:', user);

    if (!user) {
      console.warn(
        `[ReferralBonus] No user found with address: ${userAddress}`,
      );
      return;
    }

    if (!user.referredBy) {
      console.warn(
        `[ReferralBonus] No referral relationship found for user: ${userAddress}`,
      );
      return;
    }

    if (!user.referredBy.referrer) {
      console.warn(
        `[ReferralBonus] No referrer found for user: ${userAddress}`,
      );
      return;
    }

    const referrer = user.referredBy.referrer;
    console.log('Referrer details:', referrer);

    const referrerBonus = points * (CONFIG.REFERRER_BONUS_PERCENTAGE / 100);
    const refereeBonus = points * (CONFIG.REFERRAL_BONUS_PERCENTAGE / 100);

    console.log(
      `Calculated bonuses - Referrer Bonus: ${referrerBonus}, Referee Bonus: ${refereeBonus}`,
    );

    try {
      // Award 10% to referrer
      console.log(
        `Awarding ${referrerBonus} points to referrer (${referrer.address})`,
      );
      await this.updateReferralPoints(referrer.address, referrerBonus);

      // Award 5% to referee (the user themselves)
      console.log(
        `Awarding ${refereeBonus} points to referee (${userAddress})`,
      );
      await this.updateReferralPoints(userAddress, refereeBonus);

      console.log(
        `[ReferralBonus] Successfully awarded ${referrerBonus} to referrer (${referrer.address}), ${refereeBonus} to referee (${userAddress})`,
      );
    } catch (error) {
      console.error(
        `[ReferralBonus] Error while awarding referral bonuses:`,
        error,
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
      //       const newUser = this.pointsRepository.create({
      //         userAddress,
      //         referralPoints: points,
      //       });
      const newUser = this.pointsRepository.create({
        userAddress,
        poolAddress: 'REFERRAL',
        referralPoints: points,
        date: new Date(),
        liquidityPoints: 0,
        swapPoints: 0,
        poolType: 'REFERRAL',
      });
      await this.pointsRepository.save(newUser);
    }
  }

  /**
   * Gets the campaign multiplier for a specific pool based on its eligibility
   */
  private getCampaignMultiplier(
    settings: Settings,
    poolConfig: PoolConfig,
  ): number {
    let multiplier = 1;
    console.log('poolConfig received in getCampaignMultiplier', poolConfig);
    if (poolConfig.bootstrappingEligible && settings.isBootstrapping) {
      multiplier *=
        this.settingsService.calculateBootstrappingMultiplier(settings);
    }
    console.log('multiplier after bootsrap', multiplier);

    if (poolConfig.earlySznEligible && settings.isEarlySzn) {
      multiplier *= this.settingsService.calculateEarlySznMultiplier(settings);
    }

    console.log('multiplier after earlySznEligible', multiplier);

    if (poolConfig.memeSznEligible && settings.isMemeSzn) {
      multiplier *= this.settingsService.calculateMemeSznMultiplier(settings);
    }

    console.log('multiplier after memeSznEligible', multiplier);

    return multiplier;
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
          multiplier = CONFIG.STABLE_STABLE_MULTIPLIER;
          break;
        case PoolType.VOLATILE_VOLATILE:
          multiplier = CONFIG.VOLATILE_VOLATILE_MULTIPLIER;
          break;
        case PoolType.VOLATILE_STABLE:
          multiplier = CONFIG.VOLATILE_STABLE_MULTIPLIER;
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

      // Get campaign multiplier for this specific pool
      const settings = await this.settingsService.getSettings();
      const campaignMultiplier = this.getCampaignMultiplier(
        settings,
        poolConfig,
      );

      console.log(
        `[LiquidityPoints Calc] pool=${balance.poolAddress} valueUSD=${balance.valueUSD} ` +
          `typeMultiplier=${multiplier} durationMultiplier=${durationMultiplier} ` +
          `campaignMultiplier=${campaignMultiplier} product=${
            balance.valueUSD *
            multiplier *
            durationMultiplier *
            campaignMultiplier
          }`,
      );

      const points =
        balance.valueUSD * multiplier * durationMultiplier * campaignMultiplier;
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
          liquidityPoints: 0,
          swapPoints: 0,
          referralPoints: 0,
          poolType: poolConfig.poolType,
        });
      }
      userPoints.liquidityPoints = points;
      userPoints.poolType = poolConfig.poolType;
      await this.pointsRepository.save(userPoints);
      console.log(
        `[PointsService] Awarded ${points} points for pool ${balance.poolAddress} (balance: $${balance.valueUSD}, streakStartDate: ${streakStartDate}, daysHeld: ${daysHeld}, duration multiplier: ${durationMultiplier})`,
      );
    }

    // Apply pool multiplier to total points (up to 4)
    const poolMultiplier = Math.min(lowestBalances.length, 4);
    let multipliedPoints = totalPoints * poolMultiplier;
    console.log(
      `[PointsService] User ${userAddress} total points: ${totalPoints}, pool multiplier: ${poolMultiplier}, after pool multiplier: ${multipliedPoints}`,
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
        liquidityPoints: 0,
        swapPoints: 0,
        referralPoints: 0,
        poolType: 'SUMMARY',
      });
    }
    summaryPoints.liquidityPoints = multipliedPoints;
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
  @Cron('*/2 * * * *')
  async calculateAndAwardDailySwapPoints() {
    const dateToProcess = new Date();
    // Process yesterday's swap transactions (like liquidity scheduler)
    dateToProcess.setDate(dateToProcess.getDate() - 1);
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
      const feeRate = CONFIG.SWAP_FEE_RATE; // 0.1% fee rate
      const feeGenerated = totalUSD * feeRate;
      let points = feeGenerated * CONFIG.POINTS_PER_DOLLAR_FEE; // points per $1 fee

      // Handle precision issues - round to 6 decimal places and ensure minimum value
      points = Math.round(points * 1000000) / 1000000; // Round to 6 decimal places
      if (points < 0.000001) {
        points = 0; // Set very small values to 0 to avoid NaN
      }

      // Update user_points for this user/pool/day
      let userPoints = await this.pointsRepository.findOne({
        where: { userAddress, poolAddress, date: dateOnly },
      });
      if (!userPoints) {
        userPoints = this.pointsRepository.create({
          userAddress,
          poolAddress,
          date: dateOnly,
          liquidityPoints: 0,
          swapPoints: 0,
          referralPoints: 0,
          poolType: poolConfig.poolType,
        });
      }
      userPoints.swapPoints += points;
      userPoints.poolType = poolConfig.poolType;
      await this.pointsRepository.save(userPoints);
      // Apply referral bonuses for swap points
      await this.applyReferralBonuses(userAddress, points);
      console.log(
        `[SwapPoints] Awarded ${points} points to ${userAddress} for pool ${poolAddress} (fee: $${feeGenerated}) on ${dateOnly.toISOString().split('T')[0]}`,
      );
    }
  }

  async getDailyTotalPoints(
    userAddress?: string,
    page: number = 1,
    limit: number = 20,
  ) {
    const offset = (page - 1) * limit;

    // Query to aggregate ALL points (liquidity + swap + referral) for each user/date
    // Exclude summary records (poolAddress = 'ALL') to avoid double counting
    const qb = this.pointsRepository
      .createQueryBuilder('points')
      .select('points.userAddress', 'userAddress')
      .addSelect('points.date', 'date')
      .addSelect(
        "COALESCE(SUM(CASE WHEN points.poolAddress = 'ALL' THEN COALESCE(points.liquidityPoints, 0) ELSE 0 END), 0)",
        'totalLiquidityPoints',
      )
      .addSelect(
        "COALESCE(SUM(CASE WHEN points.poolAddress != 'ALL' THEN COALESCE(points.swapPoints, 0) ELSE 0 END), 0)",
        'totalSwapPoints',
      )
      .addSelect(
        'COALESCE(SUM(COALESCE(points.referralPoints, 0)), 0)',
        'totalReferralPoints',
      )
      .groupBy('points.userAddress')
      .addGroupBy('points.date');

    if (userAddress) {
      qb.andWhere('points.userAddress = :userAddress', { userAddress });
    }

    // Get total count for pagination
    const totalCount = await qb.getCount();

    // Apply pagination
    qb.limit(limit).offset(offset);

    const results = await qb
      .orderBy(
        "(COALESCE(SUM(COALESCE(points.liquidityPoints, 0)), 0) + COALESCE(SUM(CASE WHEN points.poolAddress != 'ALL' THEN COALESCE(points.swapPoints, 0) ELSE 0 END), 0) + COALESCE(SUM(COALESCE(points.referralPoints, 0)), 0))",
        'DESC',
      )
      .addOrderBy('points.date', 'DESC')
      .getRawMany();

    // Add total column
    const withTotal = results.map((row) => ({
      ...row,
      totalActionPoints:
        Number(row.totalLiquidityPoints) + Number(row.totalSwapPoints),
      total:
        Number(row.totalLiquidityPoints) +
        Number(row.totalSwapPoints) +
        Number(row.totalReferralPoints),
    }));

    // If querying for all users, add rank by total (descending)
    if (!userAddress) {
      withTotal.forEach((row, idx) => {
        row.rank = offset + idx + 1;
      });
    }

    return {
      data: withTotal,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: page < Math.ceil(totalCount / limit),
        hasPrev: page > 1,
      },
    };
  }

  async getLeaderboard(userAddress?: string) {
    // Get all users with their total points
    const qb = this.pointsRepository
      .createQueryBuilder('points')
      .select('points.userAddress', 'userAddress')
      .addSelect(
        "COALESCE(SUM(CASE WHEN points.poolAddress = 'ALL' THEN COALESCE(points.liquidityPoints, 0) ELSE 0 END), 0) + COALESCE(SUM(CASE WHEN points.poolAddress != 'ALL' THEN COALESCE(points.swapPoints, 0) ELSE 0 END), 0)",
        'actionPoints',
      )
      .addSelect(
        'COALESCE(SUM(COALESCE(points.referralPoints, 0)), 0)',
        'referralPoints',
      )
      .groupBy('points.userAddress');

    const results = await qb
      .orderBy(
        "(COALESCE(SUM(CASE WHEN points.poolAddress = 'ALL' THEN COALESCE(points.liquidityPoints, 0) ELSE 0 END), 0) + COALESCE(SUM(CASE WHEN points.poolAddress != 'ALL' THEN COALESCE(points.swapPoints, 0) ELSE 0 END), 0) + COALESCE(SUM(COALESCE(points.referralPoints, 0)), 0))",
        'DESC',
      )
      .getRawMany();

    // Calculate totals and add ranks
    const withTotals = results.map((row, index) => ({
      ...row,
      actionPoints: Number(row.actionPoints),
      referralPoints: Number(row.referralPoints),
      total: Number(row.actionPoints) + Number(row.referralPoints),
      rank: index + 1,
    }));

    // Find current user's rank if provided
    let currentUserRank = -1;
    let currentUserData: any = null;
    if (userAddress) {
      currentUserData = withTotals.find(
        (user: any) =>
          user.userAddress.toLowerCase() === userAddress.toLowerCase(),
      );
      if (currentUserData) {
        currentUserRank = currentUserData.rank;
      }
    }

    // Get top 5
    const top5 = withTotals.slice(0, 5);

    // Get users around current user (2 above, 2 below)
    let aroundUser: any[] = [];
    if (currentUserRank > 0) {
      const startIndex = Math.max(0, currentUserRank - 3); // -3 to get 2 above + current user
      const endIndex = Math.min(withTotals.length, currentUserRank + 2); // +2 to get 2 below
      aroundUser = withTotals.slice(startIndex, endIndex);

      // Mark current user as "You"
      aroundUser = aroundUser.map((user: any) => ({
        ...user,
        rank:
          user.userAddress.toLowerCase() === (userAddress || '').toLowerCase()
            ? 'You'
            : user.rank,
      }));
    }

    return {
      top5,
      aroundUser,
      currentUserRank: currentUserRank > 0 ? currentUserRank : null,
      totalUsers: withTotals.length,
    };
  }
}
