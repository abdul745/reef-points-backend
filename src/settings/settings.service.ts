// filepath: src/settings/settings.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Settings } from './entities/settings.entity';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Settings)
    private readonly settingsRepository: Repository<Settings>,
  ) {}

  async getSettings(): Promise<Settings> {
    let settings = await this.settingsRepository.findOne({ where: { id: 1 } });
    if (!settings) {
      settings = this.settingsRepository.create({
        totalPools: 0,
        isBootstrapping: false,
        isEarlySzn: false,
        isMemeSzn: false,
        bootstrappingStartDate: null,
        earlySznStartDate: null,
        memeSznStartDate: null,
      });
      await this.settingsRepository.save(settings);
    }
    return settings;
  }

  async updateSettings(updateData: Partial<Settings>): Promise<Settings> {
    const settings = await this.getSettings();

    // Auto-set start dates when campaigns are enabled
    if (updateData.isBootstrapping && !settings.isBootstrapping) {
      updateData.bootstrappingStartDate = new Date();
    }
    if (updateData.isEarlySzn && !settings.isEarlySzn) {
      updateData.earlySznStartDate = new Date();
    }
    if (updateData.isMemeSzn && !settings.isMemeSzn) {
      updateData.memeSznStartDate = new Date();
    }

    Object.assign(settings, updateData);
    return await this.settingsRepository.save(settings);
  }

  /**
   * Calculate time-based decay multiplier for bootstrapping campaign
   * Starts at 5x and decays to 1x over 14 days
   */
  calculateBootstrappingMultiplier(
    settings: Settings,
    processingDate?: Date,
  ): number {
    if (!settings.isBootstrapping || !settings.bootstrappingStartDate) {
      return 1;
    }

    const now = processingDate || new Date();
    const startDate = new Date(settings.bootstrappingStartDate);
    const daysElapsed =
      (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);

    if (daysElapsed >= 14) {
      return 1; // Fully decayed
    }

    // Linear decay from 5 to 1 over 14 days
    const decayRate = (5 - 1) / 14; // 4/14 = 0.286 per day
    const multiplier = 5 - daysElapsed * decayRate;

    return Math.max(1, multiplier);
  }

  /**
   * Calculate time-based decay multiplier for early season campaign
   * Starts at 5x and decays to 1x over 28 days
   */
  calculateEarlySznMultiplier(
    settings: Settings,
    processingDate?: Date,
  ): number {
    if (!settings.isEarlySzn || !settings.earlySznStartDate) {
      return 1;
    }

    const now = processingDate || new Date();
    const startDate = new Date(settings.earlySznStartDate);
    const daysElapsed =
      (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);

    if (daysElapsed >= 28) {
      return 1; // Fully decayed
    }

    // Linear decay from 5 to 1 over 28 days
    const decayRate = (5 - 1) / 28; // 4/28 = 0.143 per day
    const multiplier = 5 - daysElapsed * decayRate;

    return Math.max(1, multiplier);
  }

  /**
   * Calculate time-based decay multiplier for meme season campaign
   * Starts at 5x and decays to 1x over 14 days
   */
  calculateMemeSznMultiplier(
    settings: Settings,
    processingDate?: Date,
  ): number {
    if (!settings.isMemeSzn || !settings.memeSznStartDate) {
      return 1;
    }

    const now = processingDate || new Date();
    const startDate = new Date(settings.memeSznStartDate);
    const daysElapsed =
      (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);

    if (daysElapsed >= 14) {
      return 1; // Fully decayed
    }

    // Linear decay from 5 to 1 over 14 days
    const decayRate = (5 - 1) / 14; // 4/14 = 0.286 per day
    const multiplier = 5 - daysElapsed * decayRate;

    return Math.max(1, multiplier);
  }

  /**
   * Get combined campaign multiplier with time-based decay
   */
  getCombinedCampaignMultiplier(
    settings: Settings,
    processingDate?: Date,
  ): number {
    const bootstrappingMultiplier = this.calculateBootstrappingMultiplier(
      settings,
      processingDate,
    );
    const earlySznMultiplier = this.calculateEarlySznMultiplier(
      settings,
      processingDate,
    );
    const memeSznMultiplier = this.calculateMemeSznMultiplier(
      settings,
      processingDate,
    );

    return bootstrappingMultiplier * earlySznMultiplier * memeSznMultiplier;
  }
}
