import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity()
export class Referral {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  referralCode: string;

  @Column()
  referralGenerator: string; // Address of the user who generated the referral

  @Column({ nullable: true })
  referralUser: string; // Address of the user who used the referral (optional)

  @CreateDateColumn()
  createdAt: Date; // Timestamp when the referral was created
}