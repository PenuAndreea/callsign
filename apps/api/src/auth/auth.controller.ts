import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { minutes, Throttle } from '@nestjs/throttler';
import type {
  AuthResponse,
  ClientType,
  LoginRequest,
  RefreshRequest,
  RegisterRequest,
  UserDto,
} from '@callsign/types';
import { loginRequestSchema, refreshRequestSchema, registerRequestSchema } from '@callsign/types';
import type { Request, Response } from 'express';

import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { AuthUser } from './auth-user';
import { AuthService } from './auth.service';
import { Client } from './decorators/client-type.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { RefreshTokenTransport } from './refresh-token-transport';

/** Web sends no body on refresh/logout (the token is in the cookie). */
const RefreshBody = () => Body(new ZodValidationPipe(refreshRequestSchema.optional()));

/** Stricter than the global limit: slows down passphrase guessing. Counted per route and IP. */
@Throttle({ default: { limit: 10, ttl: minutes(1) } })
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly transport: RefreshTokenTransport,
  ) {}

  @Public()
  @Post('register')
  async register(
    @Body(new ZodValidationPipe(registerRequestSchema)) body: RegisterRequest,
    @Client() client: ClientType,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    return this.transport.send(res, client, await this.auth.register(body, client));
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body(new ZodValidationPipe(loginRequestSchema)) body: LoginRequest,
    @Client() client: ClientType,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    return this.transport.send(res, client, await this.auth.login(body, client));
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @RefreshBody() body: RefreshRequest | undefined,
    @Client() client: ClientType,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const session = await this.auth.refresh(this.transport.read(req, client, body));
    return this.transport.send(res, client, session);
  }

  /** Public: works with an expired access token, so a client can always log out. */
  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @RefreshBody() body: RefreshRequest | undefined,
    @Client() client: ClientType,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.auth.logout(this.transport.read(req, client, body));
    this.transport.clear(res, client);
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser): Promise<UserDto> {
    return this.auth.me(user.userId);
  }
}
