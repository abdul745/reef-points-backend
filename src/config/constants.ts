// Centralized configuration constants
export const CONFIG = {
  // External APIs
  SQUID_URL:
    process.env.SQUID_URL || 'https://squid.subsquid.io/reef-swap/graphql',
  REEFSCAN_API_URL:
    process.env.REEFSCAN_API_URL || 'https://api.reefscan.com/price/reef',

  // Token Addresses
  REEF_TOKEN_ADDRESS:
    process.env.REEF_TOKEN_ADDRESS ||
    '0x0000000000000000000000000000000001000000',
  USDC_TOKEN_ADDRESS:
    process.env.USDC_TOKEN_ADDRESS ||
    '0x7922d8785d93e692bb584e659b607fa821e6a91a',

  // Cache Configuration
  CACHE_TTL: parseInt(process.env.CACHE_TTL || '300'),
  REEF_PRICE_CACHE_TTL: parseInt(process.env.REEF_PRICE_CACHE_TTL || '1800'),
  POOLS_CACHE_TTL: parseInt(process.env.POOLS_CACHE_TTL || '300'),

  // Business Logic Constants
  MIN_REEF_RESERVE: parseInt(process.env.MIN_REEF_RESERVE || '100'),
  MIN_TOKEN_RESERVE: parseInt(process.env.MIN_TOKEN_RESERVE || '100'),
  SAFE_MAX_VALUE: parseInt(process.env.SAFE_MAX_VALUE || '1e12'),
  SWAP_FEE_RATE: parseFloat(process.env.SWAP_FEE_RATE || '0.001'),
  POINTS_PER_DOLLAR_FEE: parseInt(process.env.POINTS_PER_DOLLAR_FEE || '200'),
  MIN_LIQUIDITY_THRESHOLD: parseFloat(
    process.env.MIN_LIQUIDITY_THRESHOLD || '1',
  ),

  // Rate Limiting
  EVENT_PROCESSING_DELAY: parseInt(process.env.EVENT_PROCESSING_DELAY || '250'),
  GRAPHQL_QUERY_LIMIT: parseInt(process.env.GRAPHQL_QUERY_LIMIT || '50'),

  // Pool Type Multipliers
  STABLE_STABLE_MULTIPLIER: parseInt(
    process.env.STABLE_STABLE_MULTIPLIER || '1',
  ),
  VOLATILE_VOLATILE_MULTIPLIER: parseInt(
    process.env.VOLATILE_VOLATILE_MULTIPLIER || '4',
  ),
  VOLATILE_STABLE_MULTIPLIER: parseInt(
    process.env.VOLATILE_STABLE_MULTIPLIER || '7',
  ),

  // Duration Multiplier Thresholds (days)
  DURATION_MULTIPLIER_1_5X_DAYS: parseInt(
    process.env.DURATION_MULTIPLIER_1_5X_DAYS || '7',
  ),
  DURATION_MULTIPLIER_2X_DAYS: parseInt(
    process.env.DURATION_MULTIPLIER_2X_DAYS || '15',
  ),
  DURATION_MULTIPLIER_3X_DAYS: parseInt(
    process.env.DURATION_MULTIPLIER_3X_DAYS || '30',
  ),
  DURATION_MULTIPLIER_4X_DAYS: parseInt(
    process.env.DURATION_MULTIPLIER_4X_DAYS || '60',
  ),
  DURATION_MULTIPLIER_5X_DAYS: parseInt(
    process.env.DURATION_MULTIPLIER_5X_DAYS || '90',
  ),

  // Campaign Duration (days)
  BOOTSTRAPPING_DURATION: parseInt(process.env.BOOTSTRAPPING_DURATION || '14'),
  EARLY_SZN_DURATION: parseInt(process.env.EARLY_SZN_DURATION || '28'),
  MEME_SZN_DURATION: parseInt(process.env.MEME_SZN_DURATION || '14'),

  // Referral Bonuses (percentages)
  REFERRAL_BONUS_PERCENTAGE: parseInt(
    process.env.REFERRAL_BONUS_PERCENTAGE || '5',
  ),
  REFERRER_BONUS_PERCENTAGE: parseInt(
    process.env.REFERRER_BONUS_PERCENTAGE || '10',
  ),
} as const;
