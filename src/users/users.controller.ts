// filepath: src/users/users.controller.ts
import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('connect-wallet')
  async connect(@Body('address') address: string): Promise<User> {
    if (!address) {
      throw new NotFoundException('Address is required');
    }
    const user = await this.usersService.findOrCreateUser(
      address.toLowerCase(),
    );
    return user;
  }

  @Get(':address')
  async getUser(@Param('address') address: string): Promise<User> {
    const user = await this.usersService.getUserByAddress(
      address.toLowerCase(),
    );
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
}
