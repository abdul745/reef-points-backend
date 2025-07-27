import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateUserLiquidityBalanceType1711389600000
  implements MigrationInterface
{
  name = 'UpdateUserLiquidityBalanceType1711389600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // First, create a new column with the correct type
    await queryRunner.query(`
      ALTER TABLE "user_liquidity" 
      ADD COLUMN "balance_new" numeric(78,0) DEFAULT 0
    `);

    // Copy data from old column to new column
    await queryRunner.query(`
      UPDATE "user_liquidity" 
      SET "balance_new" = "balance"::text
    `);

    // Drop the old column
    await queryRunner.query(`
      ALTER TABLE "user_liquidity" 
      DROP COLUMN "balance"
    `);

    // Rename the new column to the original name
    await queryRunner.query(`
      ALTER TABLE "user_liquidity" 
      RENAME COLUMN "balance_new" TO "balance"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert back to bigint
    await queryRunner.query(`
      ALTER TABLE "user_liquidity" 
      ADD COLUMN "balance_old" bigint DEFAULT 0
    `);

    await queryRunner.query(`
      UPDATE "user_liquidity" 
      SET "balance_old" = "balance"::bigint
    `);

    await queryRunner.query(`
      ALTER TABLE "user_liquidity" 
      DROP COLUMN "balance"
    `);

    await queryRunner.query(`
      ALTER TABLE "user_liquidity" 
      RENAME COLUMN "balance_old" TO "balance"
    `);
  }
}
