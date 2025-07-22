import {
  Entity,
  Column,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  Index,
} from 'typeorm';

@Entity()
@Index(['userAddress', 'poolAddress', 'date'], { unique: true })
export class LiquidityBalance {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userAddress: string;

  @Column()
  poolAddress: string;

  @Column()
  token0Address: string;

  @Column()
  token1Address: string;

  @Column({ type: 'float', default: 0 })
  amount0: number;

  @Column({ type: 'float', default: 0 })
  amount1: number;

  @Column({ type: 'float', default: 0 })
  valueUSD: number;

  @Column({
    type: 'float',
    default: 0,
    comment: 'The final balance at the end of the day',
  })
  finalBalance: number;

  @Column({ type: 'date' })
  date: Date;

  @Column({
    type: 'date',
    nullable: true,
    comment: 'Start date of current >$1 streak for duration multiplier',
  })
  streakStartDate: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
}
