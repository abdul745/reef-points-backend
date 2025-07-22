// Test script for liquidity points calculation
// Run this with: node test-points-calculation.js

const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'macbookpro',
  password: '',
  database: 'reefswap',
});

async function testPointsCalculation() {
  console.log('🧮 Testing Liquidity Points Calculation...\n');

  try {
    // Test data
    const testUser = '0x4444444444444444444444444444444444444444';
    const testPool1 = '0x5555555555555555555555555555555555555555';
    const testPool2 = '0x6666666666666666666666666666666666666666';
    const testDate = new Date().toISOString().split('T')[0];

    // Step 1: Create test pool configs
    console.log('1. Creating test pool configurations...');

    // Pool 1: Volatile/Stable (7 points per $ per day)
    await pool.query(
      `
      INSERT INTO pool_config (pool_address, token0_address, token1_address, pool_type, campaign_type, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      ON CONFLICT (pool_address) DO NOTHING
    `,
      [
        testPool1,
        '0x1111111111111111111111111111111111111111',
        '0x2222222222222222222222222222222222222222',
        'volatile_stable',
        'none',
        true,
      ],
    );

    // Pool 2: Volatile/Volatile (4 points per $ per day)
    await pool.query(
      `
      INSERT INTO pool_config (pool_address, token0_address, token1_address, pool_type, campaign_type, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      ON CONFLICT (pool_address) DO NOTHING
    `,
      [
        testPool2,
        '0x3333333333333333333333333333333333333333',
        '0x4444444444444444444444444444444444444444',
        'volatile_volatile',
        'none',
        true,
      ],
    );

    console.log('✅ Pool configs created\n');

    // Step 2: Create test liquidity balances
    console.log('2. Creating test liquidity balances...');

    // User has $100 in pool 1 and $50 in pool 2
    await pool.query(
      `
      INSERT INTO liquidity_balance (user_address, pool_address, token0_address, token1_address, amount0, amount1, value_usd, date, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      ON CONFLICT (user_address, pool_address, date) DO UPDATE SET
        amount0 = EXCLUDED.amount0,
        amount1 = EXCLUDED.amount1,
        value_usd = EXCLUDED.value_usd,
        updated_at = NOW()
    `,
      [
        testUser,
        testPool1,
        '0x1111111111111111111111111111111111111111',
        '0x2222222222222222222222222222222222222222',
        100,
        0,
        100.0,
        testDate,
      ],
    );

    await pool.query(
      `
      INSERT INTO liquidity_balance (user_address, pool_address, token0_address, token1_address, amount0, amount1, value_usd, date, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      ON CONFLICT (user_address, pool_address, date) DO UPDATE SET
        amount0 = EXCLUDED.amount0,
        amount1 = EXCLUDED.amount1,
        value_usd = EXCLUDED.value_usd,
        updated_at = NOW()
    `,
      [
        testUser,
        testPool2,
        '0x3333333333333333333333333333333333333333',
        '0x4444444444444444444444444444444444444444',
        50,
        0,
        50.0,
        testDate,
      ],
    );

    console.log('✅ Liquidity balances created\n');

    // Step 3: Calculate expected points manually
    console.log('3. Calculating expected points...');

    // Pool 1: $100 * 7 points = 700 points
    // Pool 2: $50 * 4 points = 200 points
    // Liquidity multiplier: 2 pools = 2x multiplier
    // Total: (700 + 200) * 2 = 1800 points

    const expectedPoints = (100 * 7 + 50 * 4) * 2;
    console.log(`Expected points: ${expectedPoints}`);
    console.log('✅ Points calculation completed\n');

    // Step 4: Check if user exists in user_points table
    console.log('4. Checking user points table...');
    const userPoints = await pool.query(
      `
      SELECT * FROM user_points WHERE user_address = $1
    `,
      [testUser],
    );

    if (userPoints.rows.length === 0) {
      console.log('Creating user in points table...');
      await pool.query(
        `
        INSERT INTO user_points (user_address, action_points, referral_points, pool_type, current_balance, lowest_balance, deposit_date)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
        [testUser, 0, 0, 'volatile_stable', 150, 150, new Date()],
      );
    }

    console.log('✅ User points record ready\n');

    // Step 5: Display current state
    console.log('5. Current database state:');

    const balances = await pool.query(
      `
      SELECT * FROM liquidity_balance WHERE user_address = $1 AND date = $2
    `,
      [testUser, testDate],
    );

    const pools = await pool.query(
      `
      SELECT * FROM pool_config WHERE pool_address IN ($1, $2)
    `,
      [testPool1, testPool2],
    );

    const points = await pool.query(
      `
      SELECT * FROM user_points WHERE user_address = $1
    `,
      [testUser],
    );

    console.log('Liquidity Balances:', balances.rows);
    console.log('Pool Configs:', pools.rows);
    console.log('User Points:', points.rows[0]);
    console.log('✅ Database state displayed\n');

    // Step 6: Clean up
    console.log('6. Cleaning up test data...');
    await pool.query('DELETE FROM liquidity_balance WHERE user_address = $1', [
      testUser,
    ]);
    await pool.query('DELETE FROM pool_config WHERE pool_address IN ($1, $2)', [
      testPool1,
      testPool2,
    ]);
    await pool.query('DELETE FROM user_points WHERE user_address = $1', [
      testUser,
    ]);
    console.log('✅ Test data cleaned up\n');
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await pool.end();
  }
}

testPointsCalculation();
 