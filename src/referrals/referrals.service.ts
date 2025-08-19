import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Referral } from './entities/referral.entity';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';

@Injectable()
export class ReferralsService {
  constructor(
    @InjectRepository(Referral)
    private readonly referralRepository: Repository<Referral>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly usersService: UsersService,
    private readonly dataSource: DataSource,
  ) {}

  async createReferral(
    referralCode: string,
    referredUserAddress: string,
  ): Promise<Referral> {
    const referrer =
      await this.usersService.getUserByReferralCode(referralCode);
    if (!referrer) {
      throw new NotFoundException(
        'Referrer not found with the given referral code.',
      );
    }

    const referred =
      await this.usersService.getUserByAddress(referredUserAddress);
    if (!referred) {
      // This should ideally not happen if the user is created upon wallet connection.
      throw new NotFoundException('Referred user not found.');
    }

    if (referrer.id === referred.id) {
      throw new BadRequestException('Users cannot refer themselves.');
    }

    const existingReferral = await this.referralRepository.findOne({
      where: { referred: { id: referred.id } },
      relations: ['referred'],
    });

    if (existingReferral) {
      throw new BadRequestException('This user has already been referred.');
    }

    const newReferral = this.referralRepository.create({
      referrer,
      referred,
    });

const savedReferral = await this.referralRepository.save(newReferral);
console.log(
  `[ReferralService] Referral created successfully. Referrer ID: ${referrer.id}, Referrer Address: ${referrer.address}, Referred ID: ${referred.id}, Referred Address: ${referred.address}, Referral ID: ${savedReferral.id}`
);

return savedReferral;
  }

  async getUserReferralInfo(userAddress: string) {
 const normalizedAddress = userAddress.toLowerCase();
    // 1. Get user's referral code
    const user = await this.userRepository.findOne({
      where: { address: normalizedAddress },
    });

    if (!user) {
      return {
        referralCode: null,
        totalValueOfReferees: 0,
        referralPoints: 0,
      };
    }

  // 2. Check if the user has liquidity or balance above $1
  const hasBalance = await this.dataSource.query(
    `
    SELECT COUNT(*) as "balanceCount"
    FROM liquidity_balance
    WHERE "userAddress" = $1 AND "valueUSD" > 1
  `,
    [userAddress],
  );

  const hasLiquidity = Number(hasBalance[0]?.balanceCount || 0) > 0;

    // 3. Get all referees/referred users by the referrer
const referees = await this.referralRepository
  .createQueryBuilder('ref')
  .leftJoin('ref.referred', 'referred') // Join the referred user
  .leftJoin('ref.referrer', 'referrer') // Join the referrer user
  .select(['referred.address as refereeAddress'])
  .where('referrer.address = :userAddress', { userAddress }) // Use the joined referrer alias
  .getRawMany();  

    // 4. Get points for each referee using direct query

// ToDo: confirm from client

// Current Approach (Points):
// Use this if your application tracks user activity (liquidity + swaps) and rewards users based on their overall contribution.

    let totalValueOfReferees = 0;
//     for (const referee of referees) {
//       const refereePoints = await this.dataSource.query(
//         `
//         SELECT
//           COALESCE(SUM("liquidityPoints"), 0) as "liquidityPoints",
//           COALESCE(SUM("swapPoints"), 0) as "swapPoints"
//         FROM user_points
//         WHERE "userAddress" = $1
//       `,
//         [referee.refereeAddress],
//       );
  
//       const totalPoints =
//         Number(refereePoints[0]?.liquidityPoints || 0) +
//         Number(refereePoints[0]?.swapPoints || 0);
//       const refereeValue = totalPoints / 200; // 200 points = $1 (adjust as needed)
//       totalValueOfReferees += refereeValue;
//     }



// Suggested Approach (Balance):
// Use this if liquidity balance is the primary metric for determining the value of referees.

const today = new Date();
const todayDate = today.toISOString().split('T')[0]; // Extract YYYY-MM-DD

for (const referee of referees) {
  const refereeBalance = await this.dataSource.query(
    `
    SELECT COALESCE(SUM("valueUSD"), 0) as "totalBalance"
    FROM liquidity_balance
    WHERE "userAddress" = $1 AND DATE("date") = $2
    `,
    [referee.refereeAddress, todayDate], // Pass today's date as a parameter
  );
today 
  const refereeValue = Number(refereeBalance[0]?.totalBalance || 0); // Directly use the balance in USD
  totalValueOfReferees += refereeValue; // Sum up the balances
}
    // 5. Get user's own referral points using direct query
    const userReferralPoints = await this.dataSource.query(
      `
      SELECT COALESCE(SUM("referralPoints"), 0) as "totalReferralPoints"
      FROM user_points
      WHERE "userAddress" = $1
    `,
      [userAddress],
    );
// todo: We do not need the balance for the current date but we need the latest balance (should be the current day balance if no error occurs)
    return {
      referralCode: hasLiquidity ? user.referralCode : null,
      totalValueOfReferees: Number(totalValueOfReferees.toFixed(2)),
      referralPoints: Number(
        userReferralPoints[0]?.totalReferralPoints.toFixed(2) || 0,
      ),
    };
  }
}
