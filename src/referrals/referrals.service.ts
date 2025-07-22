import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Referral } from './entities/referral.entity';
import { UsersService } from '../users/users.service';

@Injectable()
export class ReferralsService {
  constructor(
    @InjectRepository(Referral)
    private readonly referralRepository: Repository<Referral>,
    private readonly usersService: UsersService,
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

    return this.referralRepository.save(newReferral);
  }
}
