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
  liquidityPoints: number; // Points from liquidity providing

  @Column({ type: 'float', default: 0 })
  swapPoints: number; // Points from swap fees

  @Column({ type: 'float', default: 0 })
  referralPoints: number;

  @Column({ type: 'varchar', default: 0 })
  poolType: string;
}
