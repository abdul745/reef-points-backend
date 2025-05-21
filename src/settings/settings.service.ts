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
      // Create default settings if none exist
      settings = this.settingsRepository.create({
        totalPools: 0,
        isBootstrapping: false,
        isEarlySzn: false,
        isMemeSzn: false,
      });
      await this.settingsRepository.save(settings);
    }
    return settings;
  }

  async updateSettings(updateData: Partial<Settings>): Promise<Settings> {
    const settings = await this.getSettings();
    Object.assign(settings, updateData);
    return await this.settingsRepository.save(settings);
  }
}