// filepath: src/users/users.controller.ts
import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('connect-wallet')
  async connectWallet(@Body('address') address: string): Promise<{ token: string }> {
    const token = this.usersService.generateJwtForWallet(address, 'user');
    return { token };
  }

  @Post('admin-login')
  async adminLogin(
    @Body() body: { username: string; password: string },
  ): Promise<{ token: string }> {
    const { username, password } = body;

    const allowed = await this.usersService.validateAdminCredentials(username, password);

    if (allowed) {
      const token = this.usersService.generateJwtForWallet(username, 'admin'); // Admin role
      return { token };
    } else {
      throw new UnauthorizedException('Invalid admin credentials');
    }
  }
}