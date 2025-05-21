// filepath: src/settings/settings.controller.ts
import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { Settings } from './entities/settings.entity';
import { Roles } from 'src/auth/roles.decorator';
import { RolesGuard } from 'src/auth/role.guard';
import { AuthGuard } from 'src/auth/auth.guard';

@Controller('settings')
@UseGuards(AuthGuard, RolesGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @Roles('admin') 
  async getSettings(): Promise<Settings> {
    return await this.settingsService.getSettings();
  }

  @Post('update')
  @Roles('admin')
  async updateSettings(@Body() updateData: Partial<Settings>): Promise<Settings> {
    return await this.settingsService.updateSettings(updateData);
  }
}