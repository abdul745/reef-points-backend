import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import { AdminAuthService } from './admin-auth.service';
import { AdminAuthGuard } from './admin-auth.guard';
import { AdminUser } from './admin.decorator';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Post('admin-login')
  async login(@Body() loginDto: { username: string; password: string }) {
    const { username, password } = loginDto;

    if (!username || !password) {
      throw new UnauthorizedException('Username and password are required');
    }

    return this.adminAuthService.login(username, password);
  }

  @Get('profile')
  @UseGuards(AdminAuthGuard)
  getProfile(@AdminUser() admin) {
    return {
      message: 'Admin profile',
      admin,
    };
  }

  @Get('dashboard')
  @UseGuards(AdminAuthGuard)
  getDashboard(@AdminUser() admin) {
    return {
      message: 'Admin dashboard',
      admin,
    };
  }
}
 