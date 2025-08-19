import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from "typeorm";

export class AddReferralRelations1754757995993 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add referrerId column
    await queryRunner.addColumn(
      "referrals",
      new TableColumn({
        name: "referrerId",
        type: "int",
        isNullable: true,
      })
    );

    await queryRunner.createForeignKey(
      "referrals",
      new TableForeignKey({
        columnNames: ["referrerId"],
        referencedColumnNames: ["id"],
        referencedTableName: "users",
        onDelete: "SET NULL",
      })
    );

    // Add referredId column
    await queryRunner.addColumn(
      "referrals",
      new TableColumn({
        name: "referredId",
        type: "int",
        isNullable: true,
      })
    );

    await queryRunner.createForeignKey(
      "referrals",
      new TableForeignKey({
        columnNames: ["referredId"],
        referencedColumnNames: ["id"],
        referencedTableName: "users",
        onDelete: "SET NULL",
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys first
    const table = await queryRunner.getTable("referrals");
    if (table) {
      const fkReferrer = table.foreignKeys.find(fk => fk.columnNames.includes("referrerId"));
      if (fkReferrer) await queryRunner.dropForeignKey("referrals", fkReferrer);

      const fkReferred = table.foreignKeys.find(fk => fk.columnNames.includes("referredId"));
      if (fkReferred) await queryRunner.dropForeignKey("referrals", fkReferred);
    }

    // Drop columns
    await queryRunner.dropColumn("referrals", "referrerId");
    await queryRunner.dropColumn("referrals", "referredId");
  }
}
