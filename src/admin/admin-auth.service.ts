import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly adminService: AdminService,
    private readonly authService: AuthService,
  ) {}

  async login(username: string, password: string) {
    const admin = await this.adminService.validateAdmin(username, password);

    if (!admin) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: admin.id,
      username: admin.username,
      role: 'admin',
    };

    return {
      access_token: this.authService.generateAdminToken(payload),
      admin: {
        id: admin.id,
        username: admin.username,
      },
    };
  }
}
