import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserPoints } from './entities/user-points.entity';
import { SettingsService } from 'src/settings/settings.service';
import { Referral } from 'src/referrals/entities/referral.entity';

@Injectable()
export class PointsService {
  constructor(
    @InjectRepository(UserPoints)
    private readonly pointsRepository: Repository<UserPoints>,

    @InjectRepository(Referral)
    private readonly referralRepository: Repository<Referral>,
    private readonly settingsService: SettingsService,
  ) {}

// depositDate should be coming from teh FE and then start point calculation from now on? If not maybe create an EP to transfer all the users data to this db
  async updateLiquidityPoints(
    userAddress: string,
    poolType: string,
    amount: number,
    totalPools: number,
    depositDate: Date,
  ): Promise<void> {
    const points = await this.calculateLiquidityPoints(userAddress, poolType, amount, totalPools, depositDate);

    // Update action points
    await this.updateActionPoints(userAddress, points, poolType, amount, depositDate);

    // Check if the user is a referralUser
    const referral = await this.referralRepository.findOne({ where: { referralUser: userAddress } });
    if (referral) {
      // Add 5% bonus to the referralUser
      const referralBonus = points * 0.05;
      await this.updateReferralPoints(userAddress, referralBonus);

      // Add 10% bonus to the referralGenerator
      const referrerBonus = points * 0.1;
      await this.updateReferralPoints(referral.referralGenerator, referrerBonus);
    }
  }


 private async updateActionPoints(userAddress: string, points: number, poolType: string, amount: number, depositDate: Date): Promise<void> {
    const user = await this.pointsRepository.findOne({ where: { userAddress } });

    if (user) {
      user.actionPoints += points;
      await this.pointsRepository.save(user);
    } else {
      const newUser = this.pointsRepository.create({ userAddress, actionPoints: points, poolType, currentBalance: amount, lowestBalance: amount, depositDate });

console.log('New user created:', newUser);
      await this.pointsRepository.save(newUser);
    }
  }

  private async updateReferralPoints(userAddress: string, points: number): Promise<void> {
    const user = await this.pointsRepository.findOne({ where: { userAddress } });

    if (user) {
      user.referralPoints += points;
      await this.pointsRepository.save(user);
    } else {
      const newUser = this.pointsRepository.create({ userAddress, referralPoints: points });
      await this.pointsRepository.save(newUser);
    }
  }

  async calculateLiquidityPoints(userAddress:string, poolType: string, 
amount: number, totalPools: number, depositDate: Date): Promise<number> {

  // Fetch the user's depositDate from the database
//   const user = await this.pointsRepository.findOne({ where: { userAddress } });

//   if (!user || !user.depositDate) {
//     throw new Error('User not found or depositDate is null');
//   }

  // Calculate daysHeld dynamically
//   const depositDate = user.depositDate;


 const deposit = new Date(depositDate);

  const currentDate = new Date();
  const daysHeld = Math.floor(
    (currentDate.getTime() - deposit.getTime()) / (1000 * 60 * 60 * 24),
  );

  const settings = await this.settingsService.getSettings();
    let basePoints = 0;

    // Base points based on pool type
    if (poolType === 'stable/stable') basePoints = amount * 2.5;
    else if (poolType === 'volatile/volatile') basePoints = amount * 5;
    else if (poolType === 'volatile/stable') basePoints = amount * 10;

    // Liquidity multiplier
    const liquidityMultiplier = Math.min(totalPools, 4);

    // Bootstrapping multiplier
    const bootstrappingMultiplier = settings.isBootstrapping ? Math.max(1, 5 - (daysHeld / 14) * 4) : 1;

    // Early Szn multiplier
    const earlySznMultiplier = settings.isEarlySzn ? Math.max(1, 5 - (daysHeld / 28) * 4) : 1;

    // Meme Szn multiplier
    const memeSznMultiplier = settings.isMemeSzn ? Math.max(1, 5 - (daysHeld / 14) * 4) : 1;

    // Duration multiplier
    let durationMultiplier = 1;
    if (daysHeld >= 90) durationMultiplier = 5;
    else if (daysHeld >= 60) durationMultiplier = 4;
    else if (daysHeld >= 30) durationMultiplier = 3;
    else if (daysHeld >= 15) durationMultiplier = 2;
    else if (daysHeld >= 7) durationMultiplier = 1.5;

    // Calculate total points
    return basePoints * liquidityMultiplier * bootstrappingMultiplier * earlySznMultiplier * memeSznMultiplier * durationMultiplier;
  }

  async updateSwapPoints(userAddress: string, feeGenerated: number, poolType: string, amount: number, depositDate: Date): Promise<void> {
    const points = this.calculateSwapPoints(feeGenerated);

    // Update action points
    await this.updateActionPoints(userAddress, points, poolType, amount, depositDate);

    // Check if the user is a referralUser
    const referral = await this.referralRepository.findOne({ where: { referralUser: userAddress } });
    if (referral) {
      // Add 5% bonus to the referralUser
      const referralBonus = points * 0.05;
      await this.updateReferralPoints(userAddress, referralBonus);

      // Add 10% bonus to the referralGenerator
      const referrerBonus = points * 0.1;
      await this.updateReferralPoints(referral.referralGenerator, referrerBonus);
    }
  }

// Needs to be called at the FE after every action that changes the balance of the user
// e.g. deposit, withdraw, etc.
// This function updates the lowest balance of the user and resets the deposit date if the balance drops to 0
// It also updates the pool type of the user
async updateLowestBalance(
  userAddress: string,
  amount: number,
  poolType: string,
): Promise<void> {
  const user = await this.pointsRepository.findOne({ where: { userAddress } });

  if (user) {
    // Update current balance
    user.currentBalance += amount;

    // If the balance drops to 0, reset the deposit date
    if (user.currentBalance <= 0) {
      user.currentBalance = 0; // Ensure balance doesn't go negative
      user.depositDate = null; // Reset deposit date
    } else if (!user.depositDate) {
      // If the user is depositing after a 0 balance, set a new deposit date
      user.depositDate = new Date();
    }

    // Update lowest balance of the day
    if (user.lowestBalance === 0 || user.currentBalance < user.lowestBalance) {
      user.lowestBalance = user.currentBalance;
    }

    // Update pool type
    user.poolType = poolType;

    await this.pointsRepository.save(user);
  } else {
    // Create a new record if the user doesn't exist
    const newUser = this.pointsRepository.create({
      userAddress,
      currentBalance: amount,
      lowestBalance: amount,
      depositDate: amount > 0 ? new Date() : null, // Set deposit date if balance is > 0
      poolType,
    });
    await this.pointsRepository.save(newUser);
  }
}

// todo: Reset lowest balance after 24 hours (After confirming)
// async resetLowestBalances(): Promise<void> {
// // Why reset to 0? 
//   await this.pointsRepository.update({}, { lowestBalance: 0 });
// }

// Resetting the lowestBalance to 0 at the end of the day would cause issues in scenarios where a user has liquidity but doesn't perform any transactions the next day. This would incorrectly reflect their lowestBalance as 0, even though they are still providing liquidity.
async resetLowestBalances(): Promise<void> {
  const users = await this.pointsRepository.find();

  for (const user of users) {
    // Carry over the current balance as the new lowest balance for the next day
    user.lowestBalance = user.currentBalance;
    await this.pointsRepository.save(user);
  }

  console.log('Carried over lowest balances for all users.');
}

  calculateSwapPoints(feeGenerated: number): number {
    return feeGenerated * 200; // 200 points per $1 fee
  }

  calculateReferralPoints(refereePoints: number): { referrerPoints: number; refereeBonus: number } {
    const referrerPoints = refereePoints * 0.1; // 10% for referrer
    const refereeBonus = refereePoints * 0.05; // 5% bonus for referee
    return { referrerPoints, refereeBonus };
  }

  async updatePoints(userAddress: string, points: number): Promise<void> {
    const user = await this.pointsRepository.findOne({ where: { userAddress } });

    if (user) {
      user.actionPoints += points; // Increment points
      await this.pointsRepository.save(user);
    } else {
      // Create a new record if the user doesn't exist
      const newUser = this.pointsRepository.create({ userAddress, actionPoints: points });
      await this.pointsRepository.save(newUser);
    }

    console.log(`Updated ${points} points for user ${userAddress}`);
  }

  async getAllPoints(): Promise<UserPoints[]> {
    return await this.pointsRepository.find();
  }

  async getPointsByAddress(userAddress: string): Promise<UserPoints | null> {
    return await this.pointsRepository.findOne({ where: { userAddress } });
  }
}