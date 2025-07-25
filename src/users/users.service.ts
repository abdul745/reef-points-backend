import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findOrCreateUser(address: string): Promise<User> {
    let user = await this.userRepository.findOne({ where: { address } });

    if (!user) {
      user = await this.createUser(address);
    }

    return user;
  }

  private async createUser(address: string): Promise<User> {
    const referralCode = this.generateReferralCode();
    const newUser = this.userRepository.create({
      address,
      referralCode,
    });

    return this.userRepository.save(newUser);
  }

  private generateReferralCode(): string {
    return uuidv4().replace(/-/g, '').substring(0, 10).toLowerCase();
  }

  async getAllUsers(): Promise<User[] | []> {
    return this.userRepository.find();
  }

  async getUserByAddress(address: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { address } });
  }

  async getUserByReferralCode(referralCode: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { referralCode } });
  }
}
