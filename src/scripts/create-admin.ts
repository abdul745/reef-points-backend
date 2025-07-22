import { NestFactory } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AdminService } from '../admin/admin.service';
import { Admin } from '../admin/entities/admin.entity';

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

async function createAdmin() {
  const app = await NestFactory.createApplicationContext(AdminCreationModule);
  const adminService = app.get(AdminService);

  // Get credentials from environment variables or use defaults
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin123';

  try {
    const admin = await adminService.createAdmin(username, password);
    console.log('✅ Admin created successfully!');
    console.log('📋 Admin Details:');
    console.log(`   ID: ${admin.id}`);
    console.log(`   Username: ${admin.username}`);
    console.log(`   Created: ${admin.createdAt}`);
    console.log('\n🔐 Login Credentials:');
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${password}`);
    console.log(
      '\n⚠️  IMPORTANT: Change the default password after first login!',
    );
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('ℹ️  Admin already exists with this username');
      console.log(`   Username: ${username}`);
    } else {
      console.error('❌ Error creating admin:', error.message);
    }
  }

  await app.close();
}

createAdmin().catch(console.error);
