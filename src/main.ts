import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for frontend integration
  app.enableCors({
    origin: process.env.FRONTEND_URL || '*', // Allow all origins in development
    credentials: true,
  });

  app.use(express.json());

  const port = process.env.PORT || 3004;
  console.log('Server is running on port:', port);
  await app.listen(port);
}
bootstrap();
