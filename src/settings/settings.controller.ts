// filepath: src/settings/settings.controller.ts
import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { Settings } from './entities/settings.entity';
import { AdminAuthGuard } from '../admin/admin-auth.guard';

@Controller('settings')
@UseGuards(AdminAuthGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  async getSettings(): Promise<Settings> {
    return await this.settingsService.getSettings();
  }

  @Post('update')
  async updateSettings(
    @Body() updateData: Partial<Settings>,
  ): Promise<Settings> {
    return await this.settingsService.updateSettings(updateData);
  }

  @Get('campaign-multipliers')
  async getCampaignMultipliers() {
    const settings = await this.settingsService.getSettings();

    const bootstrappingMultiplier =
      this.settingsService.calculateBootstrappingMultiplier(settings);
    const earlySznMultiplier =
      this.settingsService.calculateEarlySznMultiplier(settings);
    const memeSznMultiplier =
      this.settingsService.calculateMemeSznMultiplier(settings);
    const combinedMultiplier =
      this.settingsService.getCombinedCampaignMultiplier(settings);

    return {
      settings: {
        isBootstrapping: settings.isBootstrapping,
        bootstrappingStartDate: settings.bootstrappingStartDate,
        isEarlySzn: settings.isEarlySzn,
        earlySznStartDate: settings.earlySznStartDate,
        isMemeSzn: settings.isMemeSzn,
        memeSznStartDate: settings.memeSznStartDate,
      },
      multipliers: {
        bootstrapping: bootstrappingMultiplier,
        earlySzn: earlySznMultiplier,
        memeSzn: memeSznMultiplier,
        combined: combinedMultiplier,
      },
    };
  }

  @Post('enable-campaign')
  async enableCampaign(
    @Body() body: { campaign: 'bootstrapping' | 'earlySzn' | 'memeSzn' },
  ) {
    const updateData: any = {};

    switch (body.campaign) {
      case 'bootstrapping':
        updateData.isBootstrapping = true;
        break;
      case 'earlySzn':
        updateData.isEarlySzn = true;
        break;
      case 'memeSzn':
        updateData.isMemeSzn = true;
        break;
    }

    const updatedSettings =
      await this.settingsService.updateSettings(updateData);
    return {
      success: true,
      message: `${body.campaign} campaign enabled`,
      settings: updatedSettings,
    };
  }
}
