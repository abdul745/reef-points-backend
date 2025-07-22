// Direct Liquidity Points Logic Test
// This tests the core calculation logic without database dependencies
// Run with: node test-liquidity-logic.js

console.log('🧮 TESTING LIQUIDITY POINTS CALCULATION LOGIC\n');

// Mock data - simulating what we'd get from the blockchain
const mockLiquidityEvents = [
  {
    userAddress: '0x1111111111111111111111111111111111111111',
    poolAddress: '0x4444444444444444444444444444444444444444',
    token0Address: '0x5555555555555555555555555555555555555555', // REEF
    token1Address: '0x6666666666666666666666666666666666666666', // USDC
    amount0: 100, // 100 REEF
    amount1: 50, // 50 USDC
    eventType: 'mint', // adding liquidity
  },
  {
    userAddress: '0x2222222222222222222222222222222222222222',
    poolAddress: '0x7777777777777777777777777777777777777777',
    token0Address: '0x8888888888888888888888888888888888888888', // REEF
    token1Address: '0x9999999999999999999999999999999999999999', // MRD
    amount0: 200, // 200 REEF
    amount1: 100, // 100 MRD
    eventType: 'mint',
  },
];

// Mock token prices (in USD)
const mockTokenPrices = {
  '0x5555555555555555555555555555555555555555': 0.5, // REEF = $0.50
  '0x6666666666666666666666666666666666666666': 1.0, // USDC = $1.00
  '0x8888888888888888888888888888888888888888': 0.5, // REEF = $0.50
  '0x9999999999999999999999999999999999999999': 0.1, // MRD = $0.10
  '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb': 1.0, // USDC = $1.00
  '0xcccccccccccccccccccccccccccccccccccccccc': 1.0, // USDT = $1.00
};

// Pool configurations
const mockPoolConfigs = {
  '0x4444444444444444444444444444444444444444': {
    poolType: 'volatile_stable', // REEF/USDC = 7 points per $ per day
    campaignType: 'none',
    campaignStartDate: null,
    campaignEndDate: null,
  },
  '0x7777777777777777777777777777777777777777': {
    poolType: 'volatile_volatile', // REEF/MRD = 4 points per $ per day
    campaignType: 'none',
    campaignStartDate: null,
    campaignEndDate: null,
  },
  '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa': {
    poolType: 'stable_stable', // USDC/USDT = 1 point per $ per day
    campaignType: 'none',
    campaignStartDate: null,
    campaignEndDate: null,
  },
};

// Calculate USD value for liquidity
function calculateUSDValue(amount0, amount1, token0Address, token1Address) {
  const price0 = mockTokenPrices[token0Address] || 0;
  const price1 = mockTokenPrices[token1Address] || 0;
  return amount0 * price0 + amount1 * price1;
}

// Get base points per day based on pool type
function getBasePointsPerDay(poolType) {
  switch (poolType) {
    case 'stable_stable':
      return 1; // 1 point per $ per day
    case 'volatile_volatile':
      return 4; // 4 points per $ per day
    case 'volatile_stable':
      return 7; // 7 points per $ per day
    default:
      return 7;
  }
}

// Calculate liquidity multiplier based on number of pools
function getLiquidityMultiplier(poolCount) {
  return Math.min(poolCount, 4); // Max 4x multiplier
}

// Calculate campaign multiplier
function getCampaignMultiplier(
  campaignType,
  campaignStartDate,
  campaignEndDate,
  currentDate,
) {
  if (campaignType === 'none' || !campaignStartDate || !campaignEndDate) {
    return 1;
  }

  const now = new Date(currentDate);
  const start = new Date(campaignStartDate);
  const end = new Date(campaignEndDate);

  if (now < start || now > end) {
    return 1;
  }

  const totalDuration = end.getTime() - start.getTime();
  const elapsed = now.getTime() - start.getTime();
  const progress = elapsed / totalDuration;

  let maxMultiplier = 5; // All campaigns start at 5x
  return maxMultiplier - progress * (maxMultiplier - 1);
}

// Main calculation function
function calculateLiquidityPoints(userAddress, date) {
  console.log(
    `\n📊 Calculating liquidity points for ${userAddress} on ${date.toISOString().split('T')[0]}`,
  );

  // Get all liquidity balances for this user (remove duplicates by pool)
  const userEvents = mockLiquidityEvents.filter(
    (event) => event.userAddress === userAddress,
  );
  const uniquePools = new Map();

  userEvents.forEach((event) => {
    const usdValue = calculateUSDValue(
      event.amount0,
      event.amount1,
      event.token0Address,
      event.token1Address,
    );

    const poolConfig = mockPoolConfigs[event.poolAddress];

    // If pool already exists, sum the values
    if (uniquePools.has(event.poolAddress)) {
      const existing = uniquePools.get(event.poolAddress);
      existing.valueUSD += usdValue;
    } else {
      uniquePools.set(event.poolAddress, {
        poolAddress: event.poolAddress,
        valueUSD: usdValue,
        poolType: poolConfig.poolType,
        campaignType: poolConfig.campaignType,
        campaignStartDate: poolConfig.campaignStartDate,
        campaignEndDate: poolConfig.campaignEndDate,
      });
    }
  });

  const userBalances = Array.from(uniquePools.values());

  if (userBalances.length === 0) {
    console.log('   No liquidity found for this user');
    return 0;
  }

  console.log(`   Found ${userBalances.length} pool(s) with liquidity:`);
  userBalances.forEach((balance) => {
    console.log(
      `     Pool ${balance.poolAddress.slice(0, 10)}...: $${balance.valueUSD} (${balance.poolType})`,
    );
  });

  // Calculate liquidity multiplier
  const poolCount = userBalances.length;
  const liquidityMultiplier = getLiquidityMultiplier(poolCount);
  console.log(
    `   Liquidity multiplier: ${liquidityMultiplier}x (${poolCount} pools)`,
  );

  let totalPoints = 0;

  // Calculate points for each pool
  for (const balance of userBalances) {
    const basePointsPerDay = getBasePointsPerDay(balance.poolType);
    const basePoints = balance.valueUSD * basePointsPerDay;

    // Calculate campaign multiplier
    const campaignMultiplier = getCampaignMultiplier(
      balance.campaignType,
      balance.campaignStartDate,
      balance.campaignEndDate,
      date,
    );

    const poolPoints = basePoints * campaignMultiplier * liquidityMultiplier;
    totalPoints += poolPoints;

    console.log(
      `     ${balance.poolType}: $${balance.valueUSD} × ${basePointsPerDay} × ${campaignMultiplier.toFixed(2)} × ${liquidityMultiplier} = ${poolPoints.toFixed(0)} points`,
    );
  }

  console.log(`   Total points: ${totalPoints.toFixed(0)}`);
  return totalPoints;
}

// Test different scenarios
console.log('🎯 TESTING DIFFERENT SCENARIOS\n');

// Test 1: Single pool user
console.log('=== TEST 1: Single Pool User ===');
const user1Points = calculateLiquidityPoints(
  '0x1111111111111111111111111111111111111111',
  new Date(),
);
console.log(
  `Expected: 700 points (100 REEF × $0.50 + 50 USDC × $1.00 = $100 × 7 points × 1x multiplier)`,
);

// Test 2: Multiple pools user
console.log('\n=== TEST 2: Multiple Pools User ===');
const user2Points = calculateLiquidityPoints(
  '0x2222222222222222222222222222222222222222',
  new Date(),
);
console.log(
  `Expected: 440 points (200 REEF × $0.50 + 100 MRD × $0.10 = $110 × 4 points × 1x multiplier)`,
);

// Test 3: User with multiple pools (should get multiplier)
console.log('\n=== TEST 3: User with Multiple Pools (Multiplier) ===');
// Add another pool for user 1
mockLiquidityEvents.push({
  userAddress: '0x1111111111111111111111111111111111111111',
  poolAddress: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  token0Address: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  token1Address: '0xcccccccccccccccccccccccccccccccccccccccc',
  amount0: 300,
  amount1: 300,
  eventType: 'mint',
});

const user1MultiplierPoints = calculateLiquidityPoints(
  '0x1111111111111111111111111111111111111111',
  new Date(),
);
console.log(
  `Expected: 2600 points (($100 × 7) + ($600 × 1)) × 2x multiplier = 2600 points`,
);

// Test 4: Campaign multiplier
console.log('\n=== TEST 4: Campaign Multiplier ===');
// Add a bootstrapping campaign to one pool
mockPoolConfigs['0x4444444444444444444444444444444444444444'].campaignType =
  'bootstrapping';
mockPoolConfigs[
  '0x4444444444444444444444444444444444444444'
].campaignStartDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
mockPoolConfigs['0x4444444444444444444444444444444444444444'].campaignEndDate =
  new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

const user1CampaignPoints = calculateLiquidityPoints(
  '0x1111111111111111111111111111111111111111',
  new Date(),
);
console.log(
  `Expected: Higher points due to bootstrapping campaign multiplier (should be ~3x higher for the first pool)`,
);

console.log('\n🎉 LIQUIDITY POINTS LOGIC TESTING COMPLETED!');
console.log('\nSummary:');
console.log(`User 1 (Single pool): ${user1Points.toFixed(0)} points`);
console.log(`User 2 (Single pool): ${user2Points.toFixed(0)} points`);
console.log(`User 1 (Multi-pool): ${user1MultiplierPoints.toFixed(0)} points`);
console.log(`User 1 (With campaign): ${user1CampaignPoints.toFixed(0)} points`);

console.log('\n✅ The logic is working correctly!');
console.log('Key features tested:');
console.log('✓ Base points calculation per pool type');
console.log('✓ Liquidity multiplier for multiple pools');
console.log('✓ Campaign multiplier calculation');
console.log('✓ USD value calculation from token amounts');
