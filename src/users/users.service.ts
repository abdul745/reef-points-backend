import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Admin } from './entities/admin.entity';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
    private readonly authService: AuthService, 
  ) {}

  async validateAdminCredentials(username: string, password: string): Promise<boolean> {
    const admin = await this.adminRepository.findOne({ where: { username } });
    if (!admin) {
      return false;
    }

    return bcrypt.compare(password, admin.password);
  }

  generateJwtForWallet(address: string, role: string): string {
    const payload = { address, role };
    return this.authService.generateToken(payload);
  }
}
