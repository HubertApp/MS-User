import { otelSDK } from './otel-setup';

otelSDK.start();

import * as http from 'http';
import * as https from 'https';
import { readFileSync } from 'fs';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import { AppModule } from './app.module';
import 'reflect-metadata';

// HTTP + HTTPS en parallèle (TLS optionnel, voir MS-notifications/ARCHITECTURE.md §10).
async function bootstrap() {
  const server = express();
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));
  await app.init();

  const httpPort = process.env.PORT ?? 3001;
  http.createServer(server).listen(httpPort);

  const certPath = process.env.TLS_CERT_PATH;
  const keyPath = process.env.TLS_KEY_PATH;
  if (certPath && keyPath) {
    const httpsPort = process.env.HTTPS_PORT ?? 3444;
    https
      .createServer(
        { cert: readFileSync(certPath), key: readFileSync(keyPath) },
        server,
      )
      .listen(httpsPort);
  }
}

void bootstrap();
