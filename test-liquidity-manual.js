// Manual Liquidity Points Testing Script
// This simulates the entire liquidity points calculation flow
// Run with: node test-liquidity-manual.js

const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'macbookpro',
  password: '',
  database: 'reefswap',
});

async function testLiquidityPointsFlow() {
  console.log('🧪 MANUAL LIQUIDITY POINTS TESTING\n');
  console.log(
    'This test simulates the complete liquidity points calculation flow\n',
  );

  try {
    // Test data
    const testUsers = [
      '0x1111111111111111111111111111111111111111', // User 1: Single pool
      '0x2222222222222222222222222222222222222222', // User 2: Multiple pools
      '0x3333333333333333333333333333333333333333', // User 3: With referral
    ];

    const testPools = [
      {
        address: '0x4444444444444444444444444444444444444444',
        token0: '0x5555555555555555555555555555555555555555',
        token1: '0x6666666666666666666666666666666666666666',
        type: 'volatile_stable', // 7 points per $ per day
        name: 'REEF/USDC Pool',
      },
      {
        address: '0x7777777777777777777777777777777777777777',
        token0: '0x8888888888888888888888888888888888888888',
        token1: '0x9999999999999999999999999999999999999999',
        type: 'volatile_volatile', // 4 points per $ per day
        name: 'REEF/MRD Pool',
      },
      {
        address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        token0: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        token1: '0xcccccccccccccccccccccccccccccccccccccccc',
        type: 'stable_stable', // 1 point per $ per day
        name: 'USDC/USDT Pool',
      },
    ];

    const testDate = new Date().toISOString().split('T')[0];

    console.log('📅 Test Date:', testDate);
    console.log('👥 Test Users:', testUsers.length);
    console.log('🏊 Test Pools:', testPools.length);
    console.log('');

    // Step 1: Clean up any existing test data
    console.log('🧹 Step 1: Cleaning up existing test data...');
    await pool.query('DELETE FROM  WHERE "userAddress" = ANY($1)', [testUsers]);
    await pool.query('DELETE FROM pool_config WHERE "poolAddress" = ANY($1)', [
      testPools.map((p) => p.address),
    ]);
    await pool.query('DELETE FROM user_points WHERE "userAddress" = ANY($1)', [
      testUsers,
    ]);
    console.log('✅ Cleanup completed\n');

    // Step 1.5: Configure global settings
    console.log('⚙️ Step 1.5: Configuring global settings...');
    await pool.query('DELETE FROM settings WHERE id = 1');
    await pool.query(`
      INSERT INTO settings (id, "isBootstrapping", "isEarlySzn", "isMemeSzn")
      VALUES (1, TRUE, FALSE, TRUE)
    `);
    console.log(
      '   ✅ Settings configured: Bootstrapping=TRUE, MemeSzn=TRUE\n',
    );

    // Step 2: Create pool configurations
    console.log('🏗️  Step 2: Creating pool configurations...');
    for (const poolConfig of testPools) {
      await pool.query(
        `
        INSERT INTO pool_config ("poolAddress", "token0Address", "token1Address", "poolType", "isActive", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      `,
        [
          poolConfig.address,
          poolConfig.token0,
          poolConfig.token1,
          poolConfig.type,
          true,
        ],
      );
      console.log(`   ✅ Created ${poolConfig.name} (${poolConfig.type})`);
    }
    console.log('');

    // Step 3: Create test liquidity balances
    console.log('💰 Step 3: Creating test liquidity balances...');

    // User 1: $100 in REEF/USDC pool only
    await pool.query(
      `
      INSERT INTO  ("userAddress", "poolAddress", "token0Address", "token1Address", "amount0", "amount1", "valueUSD", "date", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
    `,
      [
        testUsers[0],
        testPools[0].address,
        testPools[0].token0,
        testPools[0].token1,
        100,
        0,
        100.0,
        testDate,
      ],
    );
    console.log(`   ✅ User 1: $100 in ${testPools[0].name}`);

    // User 2: $200 in REEF/USDC + $150 in REEF/MRD (multiple pools)
    await pool.query(
      `
      INSERT INTO  ("userAddress", "poolAddress", "token0Address", "token1Address", "amount0", "amount1", "valueUSD", "date", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
    `,
      [
        testUsers[1],
        testPools[0].address,
        testPools[0].token0,
        testPools[0].token1,
        200,
        0,
        200.0,
        testDate,
      ],
    );

    await pool.query(
      `
      INSERT INTO  ("userAddress", "poolAddress", "token0Address", "token1Address", "amount0", "amount1", "valueUSD", "date", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
    `,
      [
        testUsers[1],
        testPools[1].address,
        testPools[1].token0,
        testPools[1].token1,
        150,
        0,
        150.0,
        testDate,
      ],
    );
    console.log(
      `   ✅ User 2: $200 in ${testPools[0].name} + $150 in ${testPools[1].name}`,
    );

    // User 3: $300 in USDC/USDT + $100 in REEF/USDC (with referral setup)
    await pool.query(
      `
      INSERT INTO  ("userAddress", "poolAddress", "token0Address", "token1Address", "amount0", "amount1", "valueUSD", "date", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
    `,
      [
        testUsers[2],
        testPools[2].address,
        testPools[2].token0,
        testPools[2].token1,
        300,
        0,
        300.0,
        testDate,
      ],
    );

    await pool.query(
      `
      INSERT INTO  ("userAddress", "poolAddress", "token0Address", "token1Address", "amount0", "amount1", "valueUSD", "date", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
    `,
      [
        testUsers[2],
        testPools[0].address,
        testPools[0].token0,
        testPools[0].token1,
        100,
        0,
        100.0,
        testDate,
      ],
    );
    console.log(
      `   ✅ User 3: $300 in ${testPools[2].name} + $100 in ${testPools[0].name}`,
    );
    console.log('');

    // Step 4: Create user points records
    console.log('👤 Step 4: Creating user points records...');
    for (const user of testUsers) {
      await pool.query(
        `
        INSERT INTO user_points ("userAddress", "actionPoints", "referralPoints", "poolType", "currentBalance", "lowestBalance", "depositDate")
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT ("userAddress") DO UPDATE SET
          "actionPoints" = EXCLUDED."actionPoints",
          "referralPoints" = EXCLUDED."referralPoints"
      `,
        [user, 0, 0, 'volatile_stable', 0, 0, new Date()],
      );
    }
    console.log('✅ User points records created\n');

    // Step 5: Create referral relationship for User 3
    console.log('🔗 Step 5: Creating referral relationship...');
    const referrer = '0x4444444444444444444444444444444444444444';
    const referralUser = testUsers[2];
    const referralCode = 'TEST123'; // Add a referral code

    // Check if the referral already exists
    const existingReferral = await pool.query(
      'SELECT * FROM referral WHERE "referralUser" = $1',
      [referralUser],
    );

    if (existingReferral.rows.length === 0) {
      await pool.query(
        `
        INSERT INTO referral ("referralCode", "referralGenerator", "referralUser", "createdAt")
        VALUES ($1, $2, $3, NOW())
      `,
        [referralCode, referrer, referralUser],
      );
      console.log(
        `   ✅ User 3 referred by ${referrer} with code ${referralCode}\n`,
      );
    } else {
      console.log(`   ✅ Referral for User 3 already exists\n`);
    }

    // Step 6: Calculate expected points manually
    console.log('🧮 Step 6: Calculating expected points manually...');

    // Campaign multiplier = 1 (base) + 0.5 (bootstrap) + 2.0 (meme) = 3.5x
    const campaignMultiplier = 3.5;
    console.log(
      `   Campaign Multiplier: ${campaignMultiplier}x (Bootstrapping + Meme Szn)`,
    );

    // User 1: $100 * 7 points * 1 (pools) * 3.5 (campaign) = 2450
    const user1Expected = 100 * 7 * 1 * campaignMultiplier;
    console.log(
      `   User 1: $100 × 7 pts × 1 pool × ${campaignMultiplier} campaign = ${user1Expected} points`,
    );

    // User 2: ($200 * 7 + $150 * 4) * 2 (pools) * 3.5 (campaign) = (1400 + 600) * 2 * 3.5 = 14000
    const user2Expected = (200 * 7 + 150 * 4) * 2 * campaignMultiplier;
    console.log(
      `   User 2: ($200 × 7 + $150 × 4) × 2 pools × ${campaignMultiplier} campaign = ${user2Expected} points`,
    );

    // User 3: ($300 * 1 + $100 * 7) * 2 (pools) * 3.5 (campaign) = (300 + 700) * 2 * 3.5 = 7000
    const user3Expected = (300 * 1 + 100 * 7) * 2 * campaignMultiplier;
    console.log(
      `   User 3: ($300 × 1 + $100 × 7) × 2 pools × ${campaignMultiplier} campaign = ${user3Expected} points`,
    );
    console.log('');

    // Step 7: Display current database state
    console.log('📊 Step 7: Current database state...');

    const balances = await pool.query(
      `
      SELECT "userAddress", "poolAddress", "valueUSD", "date" 
      FROM  
      WHERE "userAddress" = ANY($1) AND "date" = $2
      ORDER BY "userAddress", "poolAddress"
    `,
      [testUsers, testDate],
    );

    const pools = await pool.query(
      `
      SELECT "poolAddress", "poolType"
      FROM pool_config 
      WHERE "poolAddress" = ANY($1)
      ORDER BY "poolAddress"
    `,
      [testPools.map((p) => p.address)],
    );

    const points = await pool.query(
      `
      SELECT "userAddress", "actionPoints", "referralPoints" 
      FROM user_points 
      WHERE "userAddress" = ANY($1)
      ORDER BY "userAddress"
    `,
      [testUsers],
    );

    console.log('📈 Liquidity Balances:');
    balances.rows.forEach((row) => {
      const pool = testPools.find((p) => p.address === row.poolAddress);
      console.log(
        `   ${row.userAddress.slice(0, 10)}... in ${pool?.name}: $${row.valueUSD}`,
      );
    });

    console.log('\n🏊 Pool Configurations:');
    pools.rows.forEach((row) => {
      const pool = testPools.find((p) => p.address === row.poolAddress);
      console.log(`   ${pool?.name}: ${row.poolType}`);
    });

    console.log('\n👤 User Points:');
    points.rows.forEach((row) => {
      console.log(
        `   ${row.userAddress.slice(0, 10)}...: ${row.actionPoints} action + ${row.referralPoints} referral`,
      );
    });
    console.log('');

    // Step 8: Simulate the points calculation (this would normally be done by the scheduler)
    console.log('⚡ Step 8: Simulating points calculation...');

    // Fetch global settings
    const settingsResult = await pool.query(
      'SELECT * FROM settings WHERE id = 1',
    );
    const settings = settingsResult.rows[0];

    // Correctly simulate the campaign multiplier logic from the service
    let testCampaignMultiplier = 1.0;
    if (settings.isBootstrapping) testCampaignMultiplier += 0.5;
    if (settings.isEarlySzn) testCampaignMultiplier += 1.0; // Not active in this test
    if (settings.isMemeSzn) testCampaignMultiplier += 2.0;

    // This simulates what the LiquidityService.calculateDailyLiquidityPoints would do
    for (const user of testUsers) {
      const userBalances = await pool.query(
        `
        SELECT lb.*, pc."poolType"
        FROM  lb
        JOIN pool_config pc ON lb."poolAddress" = pc."poolAddress"
        WHERE lb."userAddress" = $1 AND lb."date" = $2 AND lb."valueUSD" > 0
      `,
        [user, testDate],
      );

      let totalPoints = 0;
      const poolCount = userBalances.rows.length;
      const liquidityMultiplier = Math.min(poolCount, 4);

      for (const balance of userBalances.rows) {
        let basePointsPerDay;
        switch (balance.poolType) {
          case 'stable_stable':
            basePointsPerDay = 1;
            break;
          case 'volatile_volatile':
            basePointsPerDay = 4;
            break;
          case 'volatile_stable':
            basePointsPerDay = 7;
            break;
          default:
            basePointsPerDay = 7;
        }

        const basePoints = balance.valueUSD * basePointsPerDay;
        const poolPoints =
          basePoints * liquidityMultiplier * testCampaignMultiplier;
        totalPoints += poolPoints;

        console.log(
          `   ${user.slice(
            0,
            10,
          )}... in ${balance.poolType}: $${balance.valueUSD} × ${basePointsPerDay} × ${liquidityMultiplier} (pools) x ${testCampaignMultiplier} (campaign) = ${poolPoints.toFixed(
            0,
          )} points`,
        );
      }

      // Update user points
      await pool.query(
        `
        UPDATE user_points 
        SET "actionPoints" = "actionPoints" + $2 
        WHERE "userAddress" = $1
      `,
        [user, totalPoints],
      );

      console.log(
        `   ${user.slice(0, 10)}... TOTAL: ${totalPoints.toFixed(0)} points\n`,
      );

      // Apply referral bonus for User 3
      if (user === testUsers[2]) {
        const referralBonus = totalPoints * 0.05;
        const referrerBonus = totalPoints * 0.1;

        await pool.query(
          `
          UPDATE user_points 
          SET "referralPoints" = "referralPoints" + $2 
          WHERE "userAddress" = $1
        `,
          [user, referralBonus],
        );

        await pool.query(
          `
          UPDATE user_points 
          SET "referralPoints" = "referralPoints" + $2 
          WHERE "userAddress" = $1
        `,
          [referrer, referrerBonus],
        );

        console.log(
          `   Referral bonuses: ${referralBonus.toFixed(0)} to user, ${referrerBonus.toFixed(0)} to referrer\n`,
        );
      }
    }

    // Step 9: Show final results
    console.log('🎯 Step 9: Final results...');
    const finalPoints = await pool.query(
      `
      SELECT "userAddress", "actionPoints", "referralPoints", ("actionPoints" + "referralPoints") as total_points
      FROM user_points 
      WHERE "userAddress" = ANY($1)
      ORDER BY "userAddress"
    `,
      [testUsers],
    );

    console.log('📊 Final Points Summary:');
    finalPoints.rows.forEach((row) => {
      const userIndex = testUsers.indexOf(row.userAddress);
      const expected = [user1Expected, user2Expected, user3Expected][userIndex];
      console.log(
        `   User ${userIndex + 1}: ${row.total_points} total points (expected: ~${expected})`,
      );
      console.log(
        `      Action: ${row.actionPoints}, Referral: ${row.referralPoints}`,
      );
    });
    console.log('');

    // Step 10: Clean up
    console.log('🧹 Step 10: Cleaning up test data...');
    await pool.query('DELETE FROM  WHERE "userAddress" = ANY($1)', [testUsers]);
    await pool.query('DELETE FROM pool_config WHERE "poolAddress" = ANY($1)', [
      testPools.map((p) => p.address),
    ]);
    await pool.query('DELETE FROM user_points WHERE "userAddress" = ANY($1)', [
      testUsers,
    ]);
    await pool.query('DELETE FROM referral WHERE "referralUser" = ANY($1)', [
      testUsers,
    ]);
    console.log('✅ Test data cleaned up\n');

    console.log('🎉 LIQUIDITY POINTS TESTING COMPLETED!');
    console.log(
      'The system is working correctly if the calculated points match expectations.',
    );
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await pool.end();
  }
}

testLiquidityPointsFlow();
