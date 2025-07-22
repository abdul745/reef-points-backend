import {
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('referrals')
export class Referral {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.referrals)
  referrer: User;

  @OneToOne(() => User, (user) => user.referredBy)
  @JoinColumn()
  referred: User;

  @CreateDateColumn()
  createdAt: Date;
}
