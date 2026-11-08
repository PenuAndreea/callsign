import { ConsoleLogger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import type { Env } from './config/env.schema';
import { configureApp } from './configure-app';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // Production: one JSON object per line, which log tooling (CloudWatch, New Relic, ...) parses
    // without rules, and which escapes values, so user input cannot forge a log line.
    // Read before the app exists, so not through ConfigService (the env is validated right after).
    logger: new ConsoleLogger({ json: process.env.NODE_ENV === 'production' }),
  });
  configureApp(app);
  const config = app.get<ConfigService<Env, true>>(ConfigService);
  await app.listen(config.get('PORT', { infer: true }));
}
void bootstrap();
