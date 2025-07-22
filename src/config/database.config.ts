import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const databaseConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'macbookpro',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'reefswap',
  autoLoadEntities: true,
  synchronize: process.env.NODE_ENV !== 'production', // Disable in production
  ssl:
    process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
};
 