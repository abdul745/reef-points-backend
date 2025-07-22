import { Entity, PrimaryColumn, Column, ManyToOne } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('user_liquidity')
export class UserLiquidity {
  @PrimaryColumn()
  userAddress: string;

  @PrimaryColumn()
  tokenAddress: string;

  @ManyToOne(() => User)
  user: User;

  @Column('bigint', { default: 0 })
  balance: bigint;
}
