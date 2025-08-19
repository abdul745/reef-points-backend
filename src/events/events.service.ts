import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PointsService } from '../points/points.service';
import { ProcessedEvent } from './entities/processed-event.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PriceService } from 'src/prices/prices.service';
import { LiquidityService } from 'src/liquidity/liquidity.service';
import { SwapTransaction } from './entities/swap-transaction.entity';
import { TransactionType } from '../liquidity/entities/liquidity-transaction.entity';
import { CONFIG } from '../config/constants';

const SQUID_URL = CONFIG.SQUID_URL;

enum PoolEventType {
  SWAP = 'Swap',
  MINT = 'Mint',
  BURN = 'Burn',
}

interface PoolEvent {
  id: string;
  blockHeight: number;
  toAddress: string;
  senderAddress?: string;
  signerAddress?: string;
  type: PoolEventType;
  amount1: string;
  amount2: string;
  pool: {
    id: string;
    token1: { id: string };
    token2: { id: string };
  };
}

const INELIGIBLE_TOKENS = [
  '0xc26ea5b0cf3c60a94d1b18a035535b381b689d9c', // XMN
  '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', // Wrapped BTC (example address)
  '0x2170ed0880ac9a755fd29b2688956bd959f933f8', // Wrapped ETH (example address)
  // Add more as needed
];

function isIneligibleToken(address: string): boolean {
  return INELIGIBLE_TOKENS.includes(address.toLowerCase());
}

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);
  private tokenPrices: Record<string, number> = {};
  private pools: any[] = [];

  constructor(
    private readonly httpService: HttpService,
    private readonly pointsService: PointsService,
    private readonly priceService: PriceService,
    private readonly liquidityService: LiquidityService,
    @InjectRepository(ProcessedEvent)
    private readonly processedEventRepository: Repository<ProcessedEvent>,
    @InjectRepository(SwapTransaction)
    private readonly swapTransactionRepository: Repository<SwapTransaction>,
  ) {}

  // ToDo: Will uncomment after testing liquidity
  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron() {
    this.logger.debug('Fetching new events...');
    await this.fetchAndProcessEvents();
  }

  // Call this on startup or before processing events
  private async refreshTokenPrices() {
    this.pools = await this.priceService.fetchAllPools();
    this.tokenPrices = {};
    await this.priceService.calculateTokenPricesFromPools(
      this.pools,
      this.tokenPrices,
    );
    this.logger.log(
      `[EventsService] Refreshed token prices: ${JSON.stringify(this.tokenPrices)}`,
    );
  }

  // Call this before processing events, or on a schedule
  private async ensureTokenPricesFresh() {
    // For now, always refresh before processing events
    await this.refreshTokenPrices();
  }

  private async fetchAndProcessEvents() {
    await this.ensureTokenPricesFresh();
    const lastProcessedBlock = await this.getLastProcessedBlock();
    const query = `
      query {
        poolEvents(where: { blockHeight_gt: ${lastProcessedBlock}, type_in: [Swap, Mint, Burn] }, orderBy: blockHeight_ASC, limit: ${CONFIG.GRAPHQL_QUERY_LIMIT}) {
          id
          blockHeight
          toAddress
          senderAddress
          signerAddress
          type
          amount1
          amount2
          pool {
            token1 { id }
            token2 { id }
          }
        }
      }
    `;

    // const query = `
    //   query {
    //     poolEvents(
    //       where: { blockHeight_eq: 12920169, type_eq: Mint }
    //     ) {
    //       id
    //       blockHeight
    //       toAddress
    //       type
    //       amount1
    //       amount2
    //       pool {
    //         token1 { id }
    //         token2 { id }
    //       }
    //     }
    //   }
    // `;

    try {
      const response = await firstValueFrom(
        this.httpService.post(SQUID_URL, { query }),
      );

      if (
        !response.data ||
        !response.data.data ||
        !response.data.data.poolEvents
      ) {
        this.logger.error(
          '[EventsService] No poolEvents data in GraphQL response',
          JSON.stringify(response.data),
        );
        return;
      }

      const events: PoolEvent[] = response.data.data.poolEvents;

      if (events.length === 0) {
        this.logger.debug('No new events to process.');
        return;
      }

      this.logger.log(`Found ${events.length} new events to process.`);

      for (const event of events) {
        const isProcessed = await this.isEventProcessed(event.id);
        if (isProcessed) {
          continue;
        }
        // Ineligible token filter (centralized)
        if (
          isIneligibleToken(event.pool.token1.id) ||
          isIneligibleToken(event.pool.token2.id)
        ) {
          this.logger.warn(
            `[fetchAndProcessEvents] Skipping event ${event.id} due to ineligible token: ${event.pool.token1.id} or ${event.pool.token2.id}`,
          );
          await this.markEventAsProcessed(event.id, event.blockHeight);
          continue;
        }
        switch (event.type) {
          case PoolEventType.SWAP:
            await this.processSwapEvent(event);
            break;
          case PoolEventType.MINT:
            await this.processMintEvent(event);
            break;
          case PoolEventType.BURN:
            await this.processBurnEvent(event);
            break;
        }
        await this.markEventAsProcessed(event.id, event.blockHeight);

        // Add a delay to avoid hitting API rate limits
        await new Promise((resolve) =>
          setTimeout(resolve, CONFIG.EVENT_PROCESSING_DELAY),
        );
      }
    } catch (error) {
      this.logger.error('Failed to fetch or process events', error.stack);
    }
  }

  private getPoolAddressFromEvent(event: PoolEvent): string {
    // Use event.pool.id if present, else fallback to token1_token2
    if (event.pool && event.pool.id) {
      return event.pool.id;
    }
    // Fallback: concatenate token1 and token2 ids
    if (event.pool && event.pool.token1 && event.pool.token2) {
      return `${event.pool.token1.id}_${event.pool.token2.id}`;
    }
    // As a last resort, return 'unknown'
    return 'unknown';
  }

  private getTokenPriceFromCache(tokenAddress: string): number | null {
    const price = this.tokenPrices[tokenAddress.toLowerCase()];
    if (price === undefined || price === null || isNaN(price)) {
      this.logger.warn(
        `[EventsService] No price found for token: ${tokenAddress}`,
      );
      return null;
    }
    return price;
  }

  private async processSwapEvent(event: PoolEvent) {
    this.logger.debug(
      `[processSwapEvent] Processing SWAP event for tokens: ${event.pool.token1.id}, ${event.pool.token2.id}`,
    );
    const price1 = this.getTokenPriceFromCache(event.pool.token1.id);
    const price2 = this.getTokenPriceFromCache(event.pool.token2.id);
    this.logger.debug(
      `[processSwapEvent] Token prices - ${event.pool.token1.id}: $${price1}, ${event.pool.token2.id}: $${price2}`,
    );
    if (!price1 || !price2 || isNaN(price1) || isNaN(price2)) {
      this.logger.warn(
        `Skipping SWAP event due to missing price for tokens: ${event.pool.token1.id}, ${event.pool.token2.id}`,
      );
      return;
    }
    const amount1 = parseFloat(event.amount1) / 1e18;
    const amount2 = parseFloat(event.amount2) / 1e18;
    const value1 = amount1 * price1;
    const value2 = amount2 * price2;
    const swapVolumeUSD = (value1 + value2) / 2; // Average value of the two tokens in the swap
    // Use canonical pool address
    const poolAddress = this.getPoolAddressFromEvent(event);
    // Ensure pool config exists and is up to date
    await this.liquidityService.getOrCreatePoolConfig(
      poolAddress,
      event.pool.token1.id,
      event.pool.token2.id,
    );
    // Store the swap event in the SwapTransaction table
    const SAFE_MAX = CONFIG.SAFE_MAX_VALUE; // $1 trillion cap for sanity
    const safeValueUSD = Math.min(swapVolumeUSD, SAFE_MAX);
    const swapTx = this.swapTransactionRepository.create({
      userAddress: event.toAddress,
      poolAddress,
      tokenIn: event.pool.token1.id,
      tokenOut: event.pool.token2.id,
      amountIn: amount1,
      amountOut: amount2,
      valueUSD: safeValueUSD,
      date: new Date(),
    });
    await this.swapTransactionRepository.save(swapTx);
    this.logger.log(
      `Saved SWAP event for ${event.toAddress} in pool ${poolAddress}, volume: $${safeValueUSD}`,
    );
  }

  private async processMintEvent(event: PoolEvent) {
    this.logger.log(
      '[LIQUIDITY] Received Mint event: ' + JSON.stringify(event, null, 2),
    );

    // For mint events, use senderAddress if toAddress is null
    const userAddress = event.toAddress || event.senderAddress;

    if (!userAddress) {
      this.logger.warn(
        `[LIQUIDITY] Skipping Mint event with no user address: ${event.id}`,
      );
      return;
    }

    this.logger.log(
      `[LIQUIDITY] Processing Mint event for user: ${userAddress}`,
    );

    // Record the Mint transaction with pool and token info
    const amount1 = parseFloat(event.amount1) / 1e18;
    const amount2 = parseFloat(event.amount2) / 1e18;
    this.logger.debug(
      `[processMintEvent] Getting prices for tokens: ${event.pool.token1.id}, ${event.pool.token2.id}`,
    );
    const price1 = this.getTokenPriceFromCache(event.pool.token1.id);
    const price2 = this.getTokenPriceFromCache(event.pool.token2.id);
    this.logger.debug(
      `[processMintEvent] Token prices - ${event.pool.token1.id}: $${price1}, ${event.pool.token2.id}: $${price2}`,
    );
    if (!price1 || !price2 || isNaN(price1) || isNaN(price2)) {
      this.logger.warn(
        `Skipping MINT event due to missing price for tokens: ${event.pool.token1.id}, ${event.pool.token2.id}`,
      );
      return;
    }
    const valueUSD = amount1 * price1 + amount2 * price2;
    const SAFE_MAX = 1e12;
    const safeValueUSD = Math.min(valueUSD, SAFE_MAX);
    const poolAddress = this.getPoolAddressFromEvent(event);
    // Ensure pool config exists and is up to date
    await this.liquidityService.getOrCreatePoolConfig(
      poolAddress,
      event.pool.token1.id,
      event.pool.token2.id,
    );
    await this.liquidityService.recordTransaction(
      userAddress,
      poolAddress,
      TransactionType.MINT,
      safeValueUSD,
      new Date(),
    );
    this.logger.log(`Processed MINT event for ${userAddress}.`);
  }

  private async processBurnEvent(event: PoolEvent) {
    // For burn, amounts are negative
    if (!event.toAddress) {
      this.logger.warn(
        `[LIQUIDITY] Skipping Burn event with null toAddress: ${event.id}`,
      );
      return;
    }

    // Record the Burn transaction with pool and token info
    const amount1 = parseFloat(event.amount1) / 1e18;
    const amount2 = parseFloat(event.amount2) / 1e18;
    this.logger.debug(
      `[processBurnEvent] Getting prices for tokens: ${event.pool.token1.id}, ${event.pool.token2.id}`,
    );
    const price1 = this.getTokenPriceFromCache(event.pool.token1.id);
    const price2 = this.getTokenPriceFromCache(event.pool.token2.id);
    this.logger.debug(
      `[processBurnEvent] Token prices - ${event.pool.token1.id}: $${price1}, ${event.pool.token2.id}: $${price2}`,
    );
    if (!price1 || !price2 || isNaN(price1) || isNaN(price2)) {
      this.logger.warn(
        `Skipping BURN event due to missing price for tokens: ${event.pool.token1.id}, ${event.pool.token2.id}`,
      );
      return;
    }
    const valueUSD = amount1 * price1 + amount2 * price2;
    const SAFE_MAX = CONFIG.SAFE_MAX_VALUE;
    const safeValueUSD = Math.min(valueUSD, SAFE_MAX);
    const poolAddress = this.getPoolAddressFromEvent(event);
    // Ensure pool config exists and is up to date
    await this.liquidityService.getOrCreatePoolConfig(
      poolAddress,
      event.pool.token1.id,
      event.pool.token2.id,
    );
    await this.liquidityService.recordTransaction(
      event.toAddress,
      poolAddress,
      TransactionType.BURN,
      safeValueUSD,
      new Date(),
    );
    this.logger.log(`Processed BURN event for ${event.toAddress}.`);
  }

  private async getLastProcessedBlock(): Promise<number> {
    const lastEvent = await this.processedEventRepository.findOne({
      where: {},
      order: { blockNumber: 'DESC' },
    });
    return lastEvent ? lastEvent.blockNumber : 0;
  }

  private async isEventProcessed(eventId: string): Promise<boolean> {
    const count = await this.processedEventRepository.count({
      where: { eventId },
    });
    return count > 0;
  }

  private async markEventAsProcessed(
    eventId: string,
    blockNumber: number,
  ): Promise<void> {
    const processedEvent = this.processedEventRepository.create({
      eventId,
      blockNumber,
    });
    await this.processedEventRepository.save(processedEvent);
  }
}
