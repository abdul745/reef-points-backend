// Simple test script for liquidity service
// Run this with: node test-liquidity.js

const { Pool } = require('pg');

// Database connection (update with your actual credentials)
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'macbookpro',
  password: '',
  database: 'reefswap',
});

async function testLiquidityService() {
  console.log('🧪 Testing Liquidity Service...\n');

  try {
    // Test 1: Check if tables exist
    console.log('1. Checking if tables exist...');
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('liquidity_balance', 'pool_config', 'user_points')
    `);

    console.log(
      'Found tables:',
      tables.rows.map((row) => row.table_name),
    );
    console.log('✅ Tables check completed\n');

    // Test 2: Insert test pool config
    console.log('2. Creating test pool config...');
    const testPoolAddress = '0x1234567890123456789012345678901234567890';
    const testToken0 = '0x1111111111111111111111111111111111111111';
    const testToken1 = '0x2222222222222222222222222222222222222222';

    await pool.query(
      `
      INSERT INTO pool_config (pool_address, token0_address, token1_address, pool_type, campaign_type, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      ON CONFLICT (pool_address) DO NOTHING
    `,
      [
        testPoolAddress,
        testToken0,
        testToken1,
        'volatile_stable',
        'none',
        true,
      ],
    );

    console.log('✅ Test pool config created\n');

    // Test 3: Insert test liquidity balance
    console.log('3. Creating test liquidity balance...');
    const testUser = '0x3333333333333333333333333333333333333333';
    const testDate = new Date().toISOString().split('T')[0];

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
        testPoolAddress,
        testToken0,
        testToken1,
        100,
        50,
        150.0,
        testDate,
      ],
    );

    console.log('✅ Test liquidity balance created\n');

    // Test 4: Check the data
    console.log('4. Checking inserted data...');
    const balanceCheck = await pool.query(
      `
      SELECT * FROM liquidity_balance WHERE user_address = $1
    `,
      [testUser],
    );

    const poolCheck = await pool.query(
      `
      SELECT * FROM pool_config WHERE pool_address = $1
    `,
      [testPoolAddress],
    );

    console.log('Liquidity Balance:', balanceCheck.rows[0]);
    console.log('Pool Config:', poolCheck.rows[0]);
    console.log('✅ Data verification completed\n');

    // Test 5: Clean up test data
    console.log('5. Cleaning up test data...');
    await pool.query('DELETE FROM liquidity_balance WHERE user_address = $1', [
      testUser,
    ]);
    await pool.query('DELETE FROM pool_config WHERE pool_address = $1', [
      testPoolAddress,
    ]);
    console.log('✅ Test data cleaned up\n');
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await pool.end();
  }
}

testLiquidityService();
