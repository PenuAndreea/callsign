import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import type { Env } from '../config/env.schema';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { jwtOptions } from './jwt-options';
import { PasswordHasher } from './password-hasher.service';
import { RefreshTokenTransport } from './refresh-token-transport';
import { TokensService } from './tokens.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) =>
        jwtOptions(
          config.get('JWT_ACCESS_SECRET', { infer: true }),
          config.get('JWT_ACCESS_TTL_SECONDS', { infer: true }),
        ),
    }),
    UsersModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, PasswordHasher, RefreshTokenTransport, TokensService],
  exports: [TokensService],
})
export class AuthModule {}
