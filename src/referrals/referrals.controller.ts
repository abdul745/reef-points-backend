import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ReferralService } from './referrals.service';
import { AuthGuard } from 'src/auth/auth.guard';

@Controller('referral')
export class ReferralController {
  constructor(private readonly referralService: ReferralService) {}

  @Post('generate')
  async generateReferralCode(@Body('userAddress') userAddress: string) {
    const referral = await this.referralService.generateReferralCode(userAddress);
    return { success: true, referral };
  }

  @Post('use')
  @UseGuards(AuthGuard)
  async useReferralCode(
    @Body() body: { referralCode: string; userAddress: string },
  ) {
    const { referralCode, userAddress } = body;
    const referral = await this.referralService.useReferralCode(referralCode, userAddress);
    return { success: true, referral };
  }
}