import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Admin } from './entities/admin.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
  ) {}

  async findByUsername(username: string): Promise<Admin | null> {
    return this.adminRepository.findOne({ where: { username } });
  }

  async createAdmin(username: string, password: string): Promise<Admin> {
    const existingAdmin = await this.findByUsername(username);
    if (existingAdmin) {
      throw new ConflictException('Admin with this username already exists');
    }

    const admin = this.adminRepository.create({
      username,
      password,
    });

    await admin.hashPassword();
    return this.adminRepository.save(admin);
  }

  async validateAdmin(
    username: string,
    password: string,
  ): Promise<Admin | null> {
    const admin = await this.findByUsername(username);
    if (!admin || !admin.isActive) {
      return null;
    }

    const isValidPassword = await admin.validatePassword(password);
    if (!isValidPassword) {
      return null;
    }

    return admin;
  }
}
