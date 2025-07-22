import { NestFactory } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AdminService } from '../admin/admin.service';
import { Admin } from '../admin/entities/admin.entity';
import * as readline from 'readline';

// Create a minimal module just for admin creation
import { Module } from '@nestjs/common';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),
        autoLoadEntities: true,
        synchronize: true,
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([Admin]),
  ],
  providers: [AdminService],
})
class AdminCreationModule {}

function askQuestion(
  rl: readline.Interface,
  question: string,
): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function createAdminSecure() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    console.log('🔐 Create Admin User');
    console.log('===================\n');

    const username = await askQuestion(rl, 'Enter admin username: ');
    const password = await askQuestion(rl, 'Enter admin password: ');
    const confirmPassword = await askQuestion(rl, 'Confirm admin password: ');

    if (!username || !password) {
      console.log('❌ Username and password are required');
      return;
    }

    if (password !== confirmPassword) {
      console.log('❌ Passwords do not match');
      return;
    }

    if (password.length < 6) {
      console.log('❌ Password must be at least 6 characters long');
      return;
    }

    rl.close();

    const app = await NestFactory.createApplicationContext(AdminCreationModule);
    const adminService = app.get(AdminService);

    try {
      const admin = await adminService.createAdmin(username, password);
      console.log('\nAdmin created successfully!');
      console.log('📋 Admin Details:');
      console.log(`   ID: ${admin.id}`);
      console.log(`   Username: ${admin.username}`);
      console.log(`   Created: ${admin.createdAt}`);
      console.log('\n🔐 Login Credentials:');
      console.log(`   Username: ${username}`);
      console.log(`   Password: [hidden for security]`);
      console.log('\n💡 You can now login at: POST /admin/admin-login');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('\nℹ️  Admin already exists with this username');
        console.log(`   Username: ${username}`);
      } else {
        console.error('\n❌ Error creating admin:', error.message);
      }
    }

    await app.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

createAdminSecure().catch(console.error);
