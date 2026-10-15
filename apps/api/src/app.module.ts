import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { minutes, ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { ApiExceptionFilter } from './common/errors/api-exception.filter';
import { validateEnv } from './config/validate-env';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateEnv }),
    DatabaseModule,
    // Per client IP, in memory (fine for one instance; use a shared store such as Redis for several).
    // Auth routes tighten this with `@Throttle`.
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ttl: minutes(1), limit: 100 }],
      errorMessage: 'Too many requests',
    }),
  ],
  controllers: [HealthController],
  providers: [
    // Registered through DI (not `app.useGlobal*`), so e2e tests get them from the module too.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
  ],
})
export class AppModule {}
