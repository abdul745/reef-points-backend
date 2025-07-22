import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { Referral } from '../../referrals/entities/referral.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  address: string;

  @Column({ unique: true, nullable: true })
  referralCode: string;

  @OneToMany(() => Referral, (referral) => referral.referrer)
  referrals: Referral[];

  @OneToOne(() => Referral, (referral) => referral.referred)
  referredBy: Referral;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
