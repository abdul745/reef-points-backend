// filepath: src/settings/settings.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Settings } from './entities/settings.entity';
import { CONFIG } from '../config/constants';

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
//   calculateBootstrappingMultiplier(
//     settings: Settings,
//     processingDate?: Date,
//   ): number {
//     if (!settings.isBootstrapping || !settings.bootstrappingStartDate) {
//       return 1;
//     }

//     const now = processingDate || new Date();
//     const startDate = new Date(settings.bootstrappingStartDate);
//     const daysElapsed =
//       (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
// console.log("calculating bootstrap multiplier - daysElapsed", daysElapsed)
//     const bootstrappingDuration = CONFIG.BOOTSTRAPPING_DURATION;
//     if (daysElapsed >= bootstrappingDuration) {
//       return 1; // Fully decayed
//     }

//     // Linear decay from 5 to 1 over configured days
//     const decayRate = (5 - 1) / bootstrappingDuration; // 4/duration per day
//     const multiplier = 5 - daysElapsed * decayRate;
// console.log("multiplier for bootstrap is", multiplier)
//     return Math.max(1, multiplier);
//   }

calculateBootstrappingMultiplier(
  settings: Settings,
  processingDate?: Date,
): number {
  if (!settings.isBootstrapping || !settings.bootstrappingStartDate) {
    return 1;
  }

const getStartOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

const now = getStartOfDay(processingDate || new Date());
const startDate = getStartOfDay(new Date(settings.bootstrappingStartDate));

console.log("now", now);
console.log("startDate", startDate);

const daysElapsed = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);


  console.log("calculating bootstrap multiplier - daysElapsed", daysElapsed);

  const bootstrappingDuration = CONFIG.BOOTSTRAPPING_DURATION;
  if (daysElapsed >= bootstrappingDuration) {
    return 1;
  }

  const decayRate = (5 - 1) / bootstrappingDuration;
  const multiplier = 5 - daysElapsed * decayRate;

  console.log("multiplier for bootstrap is", multiplier);

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

    const earlySznDuration = CONFIG.EARLY_SZN_DURATION;
    if (daysElapsed >= earlySznDuration) {
      return 1; // Fully decayed
    }

    // Linear decay from 5 to 1 over configured days
    const decayRate = (5 - 1) / earlySznDuration; // 4/duration per day
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

    const memeSznDuration = CONFIG.MEME_SZN_DURATION;
    if (daysElapsed >= memeSznDuration) {
      return 1; // Fully decayed
    }

    // Linear decay from 5 to 1 over configured days
    const decayRate = (5 - 1) / memeSznDuration; // 4/duration per day
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
