import './otel-setup';

import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import 'reflect-metadata';

import { ValidationPipe } from '@nestjs/common';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(
    process.env.NODE_ENV === 'production' ? helmet() :
    helmet({contentSecurityPolicy: false}),
  );

  app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  
  await app.listen(process.env.PORT ?? 3001);
}

void bootstrap();
