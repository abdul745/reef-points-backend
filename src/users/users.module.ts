// filepath: src/users/users.module.ts
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { Admin } from './entities/admin.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([Admin]), AuthModule],
  providers: [UsersService],
  controllers: [UsersController],
})
export class UsersModule {}