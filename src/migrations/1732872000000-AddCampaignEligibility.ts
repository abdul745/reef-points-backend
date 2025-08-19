import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCampaignEligibility1732872000000 implements MigrationInterface {
  name = 'AddCampaignEligibility1732872000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "pool_config" 
      ADD COLUMN "bootstrappingEligible" boolean DEFAULT false,
      ADD COLUMN "earlySznEligible" boolean DEFAULT false,
      ADD COLUMN "memeSznEligible" boolean DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "pool_config" 
      DROP COLUMN "bootstrappingEligible",
      DROP COLUMN "earlySznEligible",
      DROP COLUMN "memeSznEligible"
    `);
  }
}
