import { Controller, Post, Body } from '@nestjs/common';
import { ReferralsService } from './referrals.service';

class CreateReferralDto {
  referralCode: string;
  address: string;
}

class UseReferralCodeDto {
  referralCode: string;
  userAddress: string;
}

@Controller('referrals')
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  @Post()
  async createReferral(@Body() createReferralDto: CreateReferralDto) {
    const { referralCode, address } = createReferralDto;
    const referral = await this.referralsService.createReferral(
      referralCode,
      address.toLowerCase(),
    );
    return { success: true, referral };
  }

  @Post('use-code')
  async useReferralCode(@Body() useReferralCodeDto: UseReferralCodeDto) {
    const { referralCode, userAddress } = useReferralCodeDto;
    const referral = await this.referralsService.createReferral(
      referralCode,
      userAddress.toLowerCase(),
    );
    return { success: true, referral };
  }
}
