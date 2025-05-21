import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Referral } from './entities/referral.entity';
import { PointsService } from '../points/points.service';

@Injectable()
export class ReferralService {
  constructor(
    @InjectRepository(Referral)
    private readonly referralRepository: Repository<Referral>,
    private readonly pointsService: PointsService, // To check if the user has an existing deposit
 private readonly dataSource: DataSource,
  ) {}

  async generateReferralCode(userAddress: string): Promise<Referral> {
    // Check if the user has an existing deposit
    const userPoints = await this.pointsService.getPointsByAddress(userAddress);
    if (!userPoints || userPoints.currentBalance <= 0) {
      throw new BadRequestException('User must have an existing deposit to generate a referral code.');
    }

    // Generate a unique referral code
    const referralCode = `${userAddress}-${Date.now()}`;

    // Save the referral code to the database
    const referral = this.referralRepository.create({
      referralCode,
      referralGenerator: userAddress,
    });
    return await this.referralRepository.save(referral);
  }

//  async useReferralCode(referralCode: string, userAddress: string): Promise<Referral> {
//     // Start a transaction
//     const queryRunner = this.dataSource.createQueryRunner();
//     await queryRunner.connect();
//     await queryRunner.startTransaction();

//     try {
//       // Find the referral by code
//       const referral = await queryRunner.manager.findOne(Referral, { where: { referralCode } });
//       if (!referral) {
//         throw new BadRequestException('Invalid referral code.');
//       }

//      if(referral.referralGenerator === userAddress) {
//         throw new BadRequestException('You cannot use your own referral code.');
//       }

//       // Check if the user has an existing deposit
//       // const userPoints = await this.pointsService.getPointsByAddress(userAddress);
//       // if (!userPoints || userPoints.points <= 0) {
//       //  throw new BadRequestException('User must have an existing deposit to use a referral code.');
//       // }

//       // Check if the referral code has already been used
//       if (referral.referralUser) {
//         throw new BadRequestException('Referral code has already been used.');
//       }

//       // Assign the referral user
//       referral.referralUser = userAddress;
//       await queryRunner.manager.save(referral);

//       // Dynamically fetch referee points
//       const refereePoints = await this.calculateRefereePoints(userAddress);
// 	console.log('Referee Points:', refereePoints);
//       // Calculate points for the referrer and referee
//       const { referrerPoints, refereeBonus } = this.pointsService.calculateReferralPoints(refereePoints);
// 	console.log('Referrer Points:', referrerPoints);
// 	console.log('Referee Bonus:', refereeBonus);

//       // Update points for the referrer and referee
//       await this.pointsService.updatePoints(referral.referralGenerator, referrerPoints);
//       await this.pointsService.updatePoints(userAddress, refereeBonus);

//       // Commit the transaction
//       await queryRunner.commitTransaction();

//       return referral;
//     } catch (error) {
//       // Rollback the transaction in case of an error
//       await queryRunner.rollbackTransaction();
//       throw error;
//     } finally {
//       // Release the query runner
//       await queryRunner.release();
//     }
// }

async useReferralCode(referralCode: string, userAddress: string): Promise<Referral> {
  const referral = await this.referralRepository.findOne({ where: { referralCode } });

  if (!referral) {
    throw new BadRequestException('Invalid referral code.');
  }

  if (referral.referralGenerator === userAddress) {
    throw new BadRequestException('You cannot use your own referral code.');
  }

  if (referral.referralUser) {
    throw new BadRequestException('Referral code has already been used.');
  }

  // Assign the referral user
  referral.referralUser = userAddress;
  return await this.referralRepository.save(referral);
}

//   private async calculateRefereePoints(userAddress: string): Promise<number> {
//     const userPoints = await this.pointsService.getPointsByAddress(userAddress);
//     return userPoints ? userPoints.points : 0;
//   }
}