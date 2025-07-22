import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

const REEF_ADDRESS = '0x0000000000000000000000000000000001000000';
const SQUID_URL = 'https://squid.subsquid.io/reef-swap/graphql';

/**
 * CLIENT USAGE PATTERN:
 *
 * // Get REEF price from ReefScan
 * const reefPrice = await priceService.getReefPriceUSD(); // 0.00032788
 *
 * // Initialize tokenPrices with REEF price
 * let tokenPrices = {
 *   [REEF_ADDRESS]: reefPrice
 * };
 *
 * // Get pools from useAllPools hook (React library)
 * const pools = useAllPools(httpClient); // Returns PoolWithReserves[]
 *
 * // Calculate other token prices using pool ratios
 * await priceService.calculateTokenPricesFromPools(pools, tokenPrices);
 *
 * // tokenPrices object now contains prices for all tokens
 * console.log(tokenPrices);
 * // {
 * //   "0x0000000000000000000000000000000001000000": 0.00032788,  // REEF
 * //   "0x9250ba0e7616357d6d98825186cf7723d38d8b23": 0.123,      // FISH
 * //   "0x7922d8785d93e692bb584e659b607fa821e6a91a": 1.00       // USDC
 * // }
 */

@Injectable()
export class PriceService {
  private readonly logger = new Logger(PriceService.name);

  // Symbol mapping for reference (not used for price fetch now)
  private readonly addressToSymbol: Record<string, string> = {
    '0x0000000000000000000000000000000001000000': 'REEF', // REEF
    '0x7922d8785d93e692bb584e659b607fa821e6a91a': 'USDC', // USDC
    '0x9250ba0e7616357d6d98825186cf7723d38d8b23': 'FISH',
    '0xc26ea5b0cf3c60a94d1b18a035535b381b689d9c': 'XMN',
    '0x8684c27e2afd0d1f0edf786b120f67f9187d5b3b': 'NONE',
    '0x61fa45f4a077278e15107a5765e39a95f8bfbe36': 'NONE',
    '0x705a050119dc75ea02988fae490c66a1110a2cbd': '',
    '0x15820d37b1cc11f102076070897acde06511b2fa': '',
    '0xebc107c6fc3780c144c35a4cc0e5e2adfa75fe46': 'HT',
    '0x1ee68593cf10a8f11eb5aaec4019ba2533afac04': 'NVV',
    '0x57ac27eadd429f88961eb4d91f6bf43fec9b7a75': 'NVV',
    '0x4815801545bdcc11c8653298741d679d3a5bdfd2': 'VNS',
    '0xcef383f7050f0b0d90b9ebb1c4711504489dfe50': 'C11',
    '0xdea8e9661451cdb293558c58c5618bac7decaf7f': 'VNS',
    '0x848b46d09c81c2f03baf4952cbddc2800a998fdb': 'REEFAQ',
    '0x5edcd87dd224f1cb68b2bf602c14fd723c651713': 'TSR1',
    '0xba7b74d7091abb62397601bdb9e0de4662c68641': '18',
  };

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly httpService: HttpService,
  ) {}

  async getReefPriceUSD(): Promise<number | null> {
    const cacheKey = 'reef_usd_price';
    this.logger.debug(`[getReefPriceUSD] Checking cache for REEF price`);
    const cached = await this.cacheManager.get<number>(cacheKey);
    if (cached !== undefined && cached !== null) {
      this.logger.debug(
        `[getReefPriceUSD] Cache hit for REEF price: $${cached}`,
      );
      return cached;
    }
    try {
      this.logger.debug(`[getReefPriceUSD] Fetching REEF price from ReefScan`);
      const response = await this.httpService.axiosRef.get(
        'https://api.reefscan.com/price/reef',
      );
      const price = response.data.usd;
      this.logger.debug(`[getReefPriceUSD] Fetched REEF price: $${price}`);
      await this.cacheManager.set(cacheKey, price, 1800); // cache for 30 min
      return price;
    } catch (error) {
      this.logger.error(
        '[getReefPriceUSD] Failed to fetch REEF price from ReefScan:',
        error.message,
      );
      return null;
    }
  }

  /**
   * Fetch all pools using the ALL_POOLS query (matches frontend)
   */
  async fetchAllPools(): Promise<any[]> {
    const cacheKey = 'all_pools';
    const cached = await this.cacheManager.get<any[]>(cacheKey);
    if (cached) {
      this.logger.debug(`[fetchAllPools] Cache hit for all pools`);
      return cached;
    }
    const query = `
      query allPools {
        allPools {
          address
          decimals1
          decimals2
          reserved1
          reserved2
          symbol1
          symbol2
          token1
          token2
          name1
          name2
          iconUrl1
          iconUrl2
        }
      }
    `;
    try {
      this.logger.debug(`[fetchAllPools] GraphQL query: ${query}`);
      const response = await this.httpService.axiosRef.post(
        SQUID_URL,
        { query },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
      if (response.data.errors) {
        this.logger.error(
          `[fetchAllPools] GraphQL errors: ${JSON.stringify(response.data.errors)}`,
        );
        return [];
      }
      const pools = response.data.data.allPools || [];
      this.logger.debug(`[fetchAllPools] Found ${pools.length} pools`);
      await this.cacheManager.set(cacheKey, pools, 300); // cache for 5 min
      return pools;
    } catch (error) {
      this.logger.error(
        `[fetchAllPools] Failed to fetch all pools:`,
        error.response?.data || error.message,
      );
      return [];
    }
  }

  /**
   * Deprecated: Fetch pools for a specific token (no longer used)
   */
  async fetchPoolsForToken(tokenAddress: string): Promise<any[]> {
    this.logger.warn(
      '[fetchPoolsForToken] Deprecated: Use fetchAllPools instead.',
    );
    return [];
  }

  /**
   * Deprecated: Get the latest reserves for a pool (no longer used)
   */
  async getPoolReserves(
    poolId: string,
  ): Promise<{ reserved1: number; reserved2: number } | null> {
    this.logger.warn(
      '[getPoolReserves] Deprecated: Use reserves from fetchAllPools.',
    );
    return null;
  }

  /**
   * Calculate token prices using pool ratios from ALL_POOLS
   * This method updates the tokenPrices object with calculated prices
   */
  async calculateTokenPricesFromPools(
    pools: any[],
    tokenPrices: Record<string, number>,
  ): Promise<void> {
    this.logger.debug(
      `[calculateTokenPricesFromPools] Calculating token prices for ${pools.length} pools`,
    );
    // Ensure REEF price is set in tokenPrices
    if (!tokenPrices[REEF_ADDRESS]) {
      const reefPrice = await this.getReefPriceUSD();
      if (reefPrice) {
        tokenPrices[REEF_ADDRESS] = reefPrice;
        this.logger.debug(
          `[calculateTokenPricesFromPools] Set REEF price: $${reefPrice}`,
        );
      } else {
        this.logger.error(
          '[calculateTokenPricesFromPools] REEF price unavailable',
        );
        return;
      }
    }
    // Robust price calculation: use only the best pool per token with sufficient liquidity
    const MIN_REEF_RESERVE = 100; // Minimum REEF in pool
    const MIN_TOKEN_RESERVE = 100; // Minimum token in pool
    const MIN_USD_PRICE = 0.0000001; // Ignore prices below this
    // Find all pools with REEF and sufficient reserves
    const reefPools = pools.filter(
      (pool) =>
        (pool.token1.toLowerCase() === REEF_ADDRESS &&
          Number(pool.reserved1) > MIN_REEF_RESERVE &&
          Number(pool.reserved2) > MIN_TOKEN_RESERVE) ||
        (pool.token2.toLowerCase() === REEF_ADDRESS &&
          Number(pool.reserved2) > MIN_REEF_RESERVE &&
          Number(pool.reserved1) > MIN_TOKEN_RESERVE),
    );
    // For each token, find the pool with the highest REEF reserve
    const tokenToBestPool: Record<string, { pool: any; reefReserve: number }> =
      {};
    for (const pool of reefPools) {
      let token, reefReserve;
      if (pool.token1.toLowerCase() === REEF_ADDRESS) {
        token = pool.token2.toLowerCase();
        reefReserve = Number(pool.reserved1);
      } else {
        token = pool.token1.toLowerCase();
        reefReserve = Number(pool.reserved2);
      }
      if (
        !tokenToBestPool[token] ||
        reefReserve > tokenToBestPool[token].reefReserve
      ) {
        tokenToBestPool[token] = { pool, reefReserve };
      }
    }
    // Now calculate prices only for the best pool per token
    for (const token in tokenToBestPool) {
      const { pool } = tokenToBestPool[token];
      const reefPrice = tokenPrices[REEF_ADDRESS];
      let price;
      if (pool.token1.toLowerCase() === REEF_ADDRESS) {
        price = (Number(pool.reserved1) / Number(pool.reserved2)) * reefPrice;
      } else {
        price = (Number(pool.reserved2) / Number(pool.reserved1)) * reefPrice;
      }
      if (price > MIN_USD_PRICE) {
        tokenPrices[token] = price;
        this.logger.debug(
          `[calculateTokenPricesFromPools] Calculated price for ${token}: $${price} using pool ${pool.address}`,
        );
      } else {
        this.logger.warn(
          `[calculateTokenPricesFromPools] Ignored price for ${token} ($${price}) from pool ${pool.address} due to being below threshold`,
        );
      }
    }
//     this.logger.debug(
//       `[calculateTokenPricesFromPools] Final tokenPrices: ${JSON.stringify(tokenPrices)}`,
//     );
  }

  /**
   * Main entry point for client usage: fetch all pools and calculate prices
   */
  async fetchPoolsAndCalculatePrices(
    tokenPrices: Record<string, number>,
  ): Promise<void> {
    const pools = await this.fetchAllPools();
    await this.calculateTokenPricesFromPools(pools, tokenPrices);
  }

  /**
   * Client usage pattern method - matches the expected API
   * Usage: calculateTokenPricesWithPools(pools, tokenPrices)
   */
  async calculateTokenPricesWithPools(
    pools: any[],
    tokenPrices: Record<string, number>,
  ): Promise<void> {
    this.logger.debug(
      `[calculateTokenPricesWithPools] Client method called with ${pools.length} pools`,
    );

    // First ensure we have REEF price
    if (!tokenPrices[REEF_ADDRESS]) {
      const reefPrice = await this.getReefPriceUSD();
      if (reefPrice) {
        tokenPrices[REEF_ADDRESS] = reefPrice;
        this.logger.debug(
          `[calculateTokenPricesWithPools] Added REEF price: $${reefPrice}`,
        );
      }
    }

    // Calculate other token prices using pool ratios
    await this.calculateTokenPricesFromPools(pools, tokenPrices);

    this.logger.debug(
      `[calculateTokenPricesWithPools] Final tokenPrices: ${JSON.stringify(tokenPrices)}`,
    );
  }
}
