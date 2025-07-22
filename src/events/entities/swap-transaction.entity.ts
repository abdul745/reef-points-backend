import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity()
@Index(['userAddress', 'poolAddress', 'date'])
export class SwapTransaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userAddress: string;

  @Column()
  poolAddress: string;

  @Column()
  tokenIn: string;

  @Column()
  tokenOut: string;

  @Column({ type: 'decimal', precision: 30, scale: 18 })
  amountIn: number;

  @Column({ type: 'decimal', precision: 30, scale: 18 })
  amountOut: number;

  @Column({ type: 'decimal', precision: 30, scale: 18 })
  valueUSD: number;

  @Column({ type: 'date' })
  date: Date;

  @CreateDateColumn()
  createdAt: Date;
}
