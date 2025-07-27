import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  MoreThan,
  LessThan,
  MoreThanOrEqual,
  LessThanOrEqual,
  Between,
} from 'typeorm';
import { LiquidityBalance } from './entities/liquidity-balance.entity';
import {
  LiquidityTransaction,
  TransactionType,
} from './entities/liquidity-transaction.entity';
import { PoolConfig, PoolType } from './entities/pool-config.entity';
import { PriceService } from '../prices/prices.service';
import { SettingsService } from '../settings/settings.service';
import { Settings } from '../settings/entities/settings.entity';
import { UserLiquidity } from './entities/user-liquidity.entity';

@Injectable()
export class LiquidityService {
  private readonly logger = new Logger(LiquidityService.name);
  private tokenPrices: Record<string, number> = {};
  private pools: any[] = [];

  constructor(
    @InjectRepository(LiquidityBalance)
    public readonly liquidityBalanceRepository: Repository<LiquidityBalance>,
    @InjectRepository(PoolConfig)
    private readonly poolConfigRepository: Repository<PoolConfig>,
    @InjectRepository(LiquidityTransaction)
    private readonly liquidityTransactionRepository: Repository<LiquidityTransaction>,
    @InjectRepository(UserLiquidity)
    private readonly userLiquidityRepository: Repository<UserLiquidity>,
    private readonly priceService: PriceService,
    private readonly settingsService: SettingsService,
  ) {}

  /**
   * Records a new liquidity transaction (mint or burn).
   */
  async recordTransaction(
    userAddress: string,
    poolAddress: string,
    type: TransactionType,
    valueUSD: number,
    date: Date,
  ): Promise<void> {
    const transaction = this.liquidityTransactionRepository.create({
      userAddress,
      poolAddress,
      type,
      valueUSD,
      date,
    });
    await this.liquidityTransactionRepository.save(transaction);
    this.logger.log(
      `Saved ${type} transaction for ${userAddress} in ${poolAddress} of $${valueUSD}`,
    );
  }

  /**
   * Calculates the lowest and final balances for a specific user and all their pools for a given day,
   * then saves the results to the liquidity_balance table.
   * This is the core logic that should be called by a daily scheduler.
   */
  async calculateAndSaveDailyBalances(
    userAddress: string,
    date: Date,
  ): Promise<void> {
    this.logger.log(
      `[calculateAndSaveDailyBalances] Called for user: ${userAddress}, date: ${date.toLocaleDateString()}`,
    );
    const previousDate = new Date(date);
    // todo uncomment after testing
    previousDate.setDate(date.getDate() - 1);
    //     previousDate.setDate(date.getDate());
    this.logger.log(
      `[calculateAndSaveDailyBalances] previousDate: ${previousDate.toLocaleDateString()}`,
    );

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all transactions for the user for the given day
    const transactions = await this.liquidityTransactionRepository
      .createQueryBuilder('lt')
      .where('lt.userAddress = :userAddress', { userAddress })
      .andWhere('DATE(lt.date) = DATE(:date)', { date })
      .orderBy('lt.date', 'ASC')
      .addOrderBy('lt.createdAt', 'ASC')
      .getMany();
    this.logger.log(
      `[calculateAndSaveDailyBalances] Transactions for ${userAddress} on ${date.toLocaleDateString()}: ${JSON.stringify(transactions)}`,
    );

    // Get all pools the user had a balance in yesterday or had a transaction in today
    const previousBalances = await this.liquidityBalanceRepository
      .createQueryBuilder('lb')
      .where('lb.userAddress = :userAddress', { userAddress })
      .andWhere('DATE(lb.date) = DATE(:date)', { date: previousDate })
      .getMany();
    this.logger.log(
      `[calculateAndSaveDailyBalances] Previous balances for ${userAddress} on ${previousDate.toLocaleDateString()}: ${JSON.stringify(previousBalances)}`,
    );

    const relevantPools = [
      ...new Set([
        ...transactions.map((t) => t.poolAddress),
        ...previousBalances.map((b) => b.poolAddress),
      ]),
    ];
    this.logger.log(
      `[calculateAndSaveDailyBalances] Relevant pools: ${JSON.stringify(relevantPools)}`,
    );

    for (const poolAddress of relevantPools) {
      const previousBalance =
        previousBalances.find((b) => b.poolAddress === poolAddress)?.valueUSD ||
        0;
      const poolTransactions = transactions.filter(
        (t) => t.poolAddress === poolAddress,
      );

      let lowestBalance: number | null = null;
      let currentBalance = previousBalance;

      for (const tx of poolTransactions) {
        if (tx.type === TransactionType.MINT) {
          currentBalance += Number(tx.valueUSD);
        } else {
          currentBalance -= Number(tx.valueUSD);
        }
        if (lowestBalance === null || currentBalance < lowestBalance) {
          lowestBalance = currentBalance;
        }
        this.logger.log(
          `[calculateAndSaveDailyBalances] After tx ${JSON.stringify(tx)}: currentBalance=${currentBalance}, lowestBalance=${lowestBalance}`,
        );
      }

      // If there were no transactions, lowestBalance will be null, so set to previousBalance
      if (lowestBalance === null) lowestBalance = previousBalance;

      // Ensure lowest balance is not negative
      const finalLowestBalance = Math.max(0, lowestBalance);
      const finalCurrentBalance = Math.max(0, currentBalance);
      this.logger.log(
        `[calculateAndSaveDailyBalances] Final lowestBalance: ${finalLowestBalance}, finalCurrentBalance: ${finalCurrentBalance}`,
      );

      // Only save balances that are above minimum threshold
      const minThreshold = parseFloat(
        process.env.MIN_LIQUIDITY_THRESHOLD || '1',
      );
      if (finalLowestBalance >= minThreshold) {
        // Determine streakStartDate
        let streakStartDate: Date = date;
        if (previousBalance > minThreshold) {
          // Get previous day's streakStartDate
          const prevDayBalance = await this.liquidityBalanceRepository
            .createQueryBuilder('lb')
            .where('lb.userAddress = :userAddress', { userAddress })
            .andWhere('lb.poolAddress = :poolAddress', { poolAddress })
            .andWhere('DATE(lb.date) = DATE(:date)', { date: previousDate })
            .getOne();
          if (prevDayBalance && prevDayBalance.streakStartDate) {
            streakStartDate = prevDayBalance.streakStartDate;
          }
        } else {
          // If this is the first time user has balance > threshold, set streakStartDate to current date
          streakStartDate = date;
        }
        // Save the calculated lowest and final balances for the day
        const dailyBalance = this.liquidityBalanceRepository.create({
          userAddress,
          poolAddress,
          date,
          valueUSD: finalLowestBalance, // We store the LOWEST balance for points calculation
          finalBalance: finalCurrentBalance, // We store the final balance for the next day's calculation
          token0Address: '', // These fields are less relevant now but kept for schema compatibility
          token1Address: '',
          amount0: 0,
          amount1: 0,
          streakStartDate,
        });
        await this.liquidityBalanceRepository.save(dailyBalance);
        // Ensure streakStartDate is a Date object for logging
        const streakStartDateObj = new Date(streakStartDate);
        this.logger.log(
          `[calculateAndSaveDailyBalances] Saved daily balance for ${userAddress} in ${poolAddress}: Lowest=$${finalLowestBalance}, Final=$${finalCurrentBalance}, StreakStartDate=${streakStartDateObj.toLocaleDateString()}`,
        );
      } else {
        this.logger.log(
          `[calculateAndSaveDailyBalances] Skipping balance for ${userAddress} in ${poolAddress}: Lowest=$${finalLowestBalance} (below $${minThreshold} threshold)`,
        );
      }
    }
  }

  /**
   * Calculate daily liquidity points for a user based on the pre-calculated lowest balances.
   */
  async calculateDailyLiquidityPoints(
    userAddress: string,
    date: Date,
  ): Promise<number> {
    const settings = await this.settingsService.getSettings();
    if (!settings) {
      this.logger.warn(
        'Global settings not found. Aborting points calculation.',
      );
      return 0;
    }

    // The balances in this table now represent the LOWEST balance for the day
    // Only consider balances above minimum threshold
    const minThreshold = parseFloat(process.env.MIN_LIQUIDITY_THRESHOLD || '1');
    const lowestBalances = await this.liquidityBalanceRepository.find({
      where: { userAddress, date, valueUSD: MoreThan(minThreshold) },
    });

    if (lowestBalances.length === 0) {
      this.logger.log(
        `[LiquidityPoints] No balances above $${minThreshold} threshold for user ${userAddress} on ${date.toISOString().split('T')[0]}`,
      );
      return 0;
    }

    const campaignMultiplier = this.getCampaignMultiplier(settings);
    const liquidityMultiplier = Math.min(lowestBalances.length, 4);

    console.log(
      `[LiquidityPoints] Campaign multiplier: ${campaignMultiplier}, Liquidity multiplier: ${liquidityMultiplier}`,
    );

    let totalPoints = 0;
    for (const balance of lowestBalances) {
      const poolConfig = await this.poolConfigRepository.findOne({
        where: { poolAddress: balance.poolAddress },
      });
      if (!poolConfig || !poolConfig.isActive) continue;

      const basePointsPerDay = this.getBasePointsPerDay(poolConfig.poolType);
      const basePoints = balance.valueUSD * basePointsPerDay;

      // Use streakStartDate for duration multiplier
      const streakStartDate = balance.streakStartDate || balance.date;

      const daysHeld = Math.floor(
        (date.getTime() - new Date(streakStartDate).getTime()) /
          (1000 * 60 * 60 * 24),
      );
      const durationMultiplier = this.getDurationMultiplierFromStreak(
        new Date(streakStartDate),
        date,
      );

      const poolPoints =
        basePoints *
        campaignMultiplier *
        liquidityMultiplier *
        durationMultiplier;
      totalPoints += poolPoints;

      console.log(
        `[LiquidityPoints] Pool: ${balance.poolAddress}, Type: ${poolConfig.poolType}, Balance: $${balance.valueUSD}, Base: ${basePoints}, streakStartDate: ${streakStartDate}, daysHeld: ${daysHeld}, Duration: ${durationMultiplier}x, Total: ${poolPoints}`,
      );
    }

    return totalPoints;
  }

  /**
   * Calculate duration multiplier based on how long user has held liquidity
   */
  public getDurationMultiplierFromStreak(
    streakStartDate: Date,
    date: Date,
  ): number {
    if (!streakStartDate) return 1;
    const daysHeld = Math.floor(
      (date.getTime() - streakStartDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const day5 = parseInt(process.env.DURATION_MULTIPLIER_5X_DAYS || '90');
    const day4 = parseInt(process.env.DURATION_MULTIPLIER_4X_DAYS || '60');
    const day3 = parseInt(process.env.DURATION_MULTIPLIER_3X_DAYS || '30');
    const day2 = parseInt(process.env.DURATION_MULTIPLIER_2X_DAYS || '15');
    const day1_5 = parseInt(process.env.DURATION_MULTIPLIER_1_5X_DAYS || '7');

    if (daysHeld >= day5) return 5;
    if (daysHeld >= day4) return 4;
    if (daysHeld >= day3) return 3;
    if (daysHeld >= day2) return 2;
    if (daysHeld >= day1_5) return 1.5;
    return 1;
  }

  /**
   * Gets the combined campaign multiplier from global settings.
   * Implements the client's time-based decay requirements.
   */
  private getCampaignMultiplier(settings: Settings): number {
    return this.settingsService.getCombinedCampaignMultiplier(settings);
  }

  /**
   * Get base points per day per dollar based on pool type
   */
  private getBasePointsPerDay(poolType: PoolType): number {
    switch (poolType) {
      case PoolType.STABLE_STABLE:
        return 2.5; // 2.5 points per $ per day
      case PoolType.VOLATILE_VOLATILE:
        return 5; // 5 points per $ per day
      case PoolType.VOLATILE_STABLE:
        return 10; // 10 points per $ per day
      default:
        return 10; // Default to volatile/stable
    }
  }

  // Call this on startup or before liquidity calculations
  private async refreshTokenPrices() {
    this.pools = await this.priceService.fetchAllPools();
    this.tokenPrices = {};
    await this.priceService.calculateTokenPricesFromPools(
      this.pools,
      this.tokenPrices,
    );
    this.logger.log(
      `[LiquidityService] Refreshed token prices: ${JSON.stringify(this.tokenPrices)}`,
    );
  }

  // Call this before calculations, or on a schedule
  private async ensureTokenPricesFresh() {
    // todo: inspect
    // For now, always refresh before calculations
    await this.refreshTokenPrices();
  }

  private getTokenPriceFromCache(tokenAddress: string): number | null {
    const price = this.tokenPrices[tokenAddress.toLowerCase()];
    if (price === undefined || price === null || isNaN(price)) {
      this.logger.warn(
        `[LiquidityService] No price found for token: ${tokenAddress}`,
      );
      return null;
    }
    return price;
  }

  /**
   * Get or create pool configuration
   */
  async getOrCreatePoolConfig(
    poolAddress: string,
    token0Address: string,
    token1Address: string,
  ): Promise<PoolConfig> {
    let poolConfig = await this.poolConfigRepository.findOne({
      where: { poolAddress },
    });

    if (!poolConfig) {
      // Automatically detect pool type using CoinGecko
      const poolType = await PoolConfig.detectPoolType(
        token0Address,
        token1Address,
      );
      this.logger.log(
        `No config found for pool ${poolAddress}, creating new one with detected type: ${poolType}.`,
      );
      poolConfig = this.poolConfigRepository.create({
        poolAddress,
        token0Address,
        token1Address,
        poolType,
        isActive: true,
      });
      await this.poolConfigRepository.save(poolConfig);
    }

    return poolConfig;
  }

  // Method to find all users who need daily balance calculation
  async getUsersForDailyCalculation(date: Date): Promise<string[]> {
    // Get users who had liquidity transactions on the target day
    const transactionUsers = await this.liquidityTransactionRepository
      .createQueryBuilder('lt')
      .select('DISTINCT lt.userAddress', 'userAddress')
      .where('DATE(lt.date) = DATE(:date)', { date })
      .getRawMany();

    // Get users who had balances above $1 the previous day
    const previousDate = new Date(date);
    previousDate.setDate(date.getDate() - 1);

    const balanceUsers = await this.liquidityBalanceRepository
      .createQueryBuilder('lb')
      .select('DISTINCT lb.userAddress', 'userAddress')
      .where('DATE(lb.date) = DATE(:date)', { date: previousDate })
      .andWhere('lb.valueUSD > 1') // Only consider balances above $1
      .getRawMany();

    // Combine and deduplicate
    const allUsers = [
      ...transactionUsers.map((u) => u.userAddress),
      ...balanceUsers.map((u) => u.userAddress),
    ];

    const uniqueUsers = [...new Set(allUsers)];
    this.logger.log(
      `Found ${uniqueUsers.length} users for daily calculation (${transactionUsers.length} from transactions, ${balanceUsers.length} from balances above $1)`,
    );

    return uniqueUsers;
  }

  async updateUserLiquidity(
    userAddress: string,
    tokenAddress: string,
    amountChange: bigint,
  ): Promise<void> {
    const normalizedUser = userAddress.toLowerCase();
    const normalizedToken = tokenAddress.toLowerCase();

    let userLiquidity = await this.userLiquidityRepository.findOne({
      where: { userAddress: normalizedUser, tokenAddress: normalizedToken },
    });

    if (!userLiquidity) {
      userLiquidity = this.userLiquidityRepository.create({
        userAddress: normalizedUser,
        tokenAddress: normalizedToken,
        balance: amountChange.toString(),
      });
    }

    const currentBalance = BigInt(userLiquidity.balance || '0');
    this.logger.log(
      `[LiquidityService] BEFORE: ${normalizedUser} in ${normalizedToken} - Current balance: ${currentBalance}, Amount change: ${amountChange}`,
    );
    let newBalance = currentBalance + amountChange;

    if (newBalance < 0n) {
      this.logger.warn(
        `[LiquidityService] Burn event caused negative balance for ${normalizedUser} in ${normalizedToken}. Setting to 0.`,
      );
      newBalance = 0n;
    }
    userLiquidity.balance = newBalance.toString();
    await this.userLiquidityRepository.save(userLiquidity);
    this.logger.log(
      `[LiquidityService] AFTER: ${normalizedUser} in ${normalizedToken} - New balance: ${newBalance}`,
    );
  }
}
