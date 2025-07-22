import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum TransactionType {
  MINT = 'mint',
  BURN = 'burn',
}

@Entity()
@Index(['userAddress', 'date'])
export class LiquidityTransaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userAddress: string;

  @Column()
  poolAddress: string;

  @Column({
    type: 'enum',
    enum: TransactionType,
  })
  type: TransactionType;

  @Column({ type: 'decimal', precision: 30, scale: 18 })
  valueUSD: number;

  @Column()
  date: Date;

  @CreateDateColumn()
  createdAt: Date;
}
