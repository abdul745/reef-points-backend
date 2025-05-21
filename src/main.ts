import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(express.json());
  console.log('Server is running on port:', process.env.PORT ?? 3004);
  await app.listen(process.env.PORT ?? 3004);
}
bootstrap();
