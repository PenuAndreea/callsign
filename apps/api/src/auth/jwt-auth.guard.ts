import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { ApiException } from '../common/errors/api.exception';
import type { AuthenticatedRequest } from './auth-user';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';
import { TokensService } from './tokens.service';

const BEARER = /^Bearer (\S+)$/i;

/**
 * Global guard: every route needs `Authorization: Bearer <accessToken>` unless it is `@Public()`.
 * Secure by default: a new route without a decorator is locked, not open by accident.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokensService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = BEARER.exec(request.headers.authorization ?? '')?.[1];
    if (!token) {
      throw new ApiException(HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED', 'Missing access token');
    }
    request.user = await this.tokens.verifyAccessToken(token);
    return true;
  }
}
