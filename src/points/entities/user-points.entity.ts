// // filepath: src/points/entities/user-points.entity.ts
// import { Entity, Column, PrimaryColumn } from 'typeorm';

// @Entity()
// export class UserPoints {
//   @PrimaryColumn()
//   userAddress: string;

//   @Column({ type: 'float', default: 0 })
//   points: number;
// }

import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity()
export class UserPoints {
  @PrimaryColumn()
  userAddress: string;

  @PrimaryColumn()
  poolAddress: string;

  @PrimaryColumn({ type: 'date' })
  date: Date;

  @Column({ type: 'float', default: 0 })
  actionPoints: number;

  @Column({ type: 'float', default: 0 })
  referralPoints: number;

  @Column({ type: 'varchar', default: 0 })
  poolType: string;

  @Column({ type: 'float', nullable: true })
  currentBalance: number; // Current liquidity balance

  @Column({ type: 'float', default: 0 })
  lowestBalance: number; // Lowest balance of the day

  @Column({ type: 'timestamp', nullable: true })
  depositDate: Date | null; // Date when the user last deposited liquidity
}
