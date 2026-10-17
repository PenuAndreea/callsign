import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { minutes, ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { ApiExceptionFilter } from './common/errors/api-exception.filter';
import { validateEnv } from './config/validate-env';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './health/health.controller';
import { MessagesModule } from './messages/messages.module';
import { RoomsModule } from './rooms/rooms.module';

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
    AuthModule,
    RoomsModule,
    MessagesModule,
  ],
  controllers: [HealthController],
  providers: [
    // Registered through DI (not `app.useGlobal*`), so e2e tests get them from the module too.
    // Global guards run in this order: throttle first, so unauthenticated floods are cut off
    // before any token work.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
  ],
})
export class AppModule {}
