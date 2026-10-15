import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AuthResponse, ClientType, RefreshRequest } from '@callsign/types';
import type { CookieOptions, Request, Response } from 'express';

import type { Env } from '../config/env.schema';
import type { IssuedTokens } from './auth.service';

export const REFRESH_COOKIE = 'refreshToken';

/**
 * How the refresh token travels, per `X-Client`:
 * - web: httpOnly cookie, never readable from JS (XSS cannot steal it), scoped to `/api/auth`.
 * - mobile: in the JSON body; the app keeps it in the secure store.
 */
@Injectable()
export class RefreshTokenTransport {
  private readonly cookie: CookieOptions;

  constructor(config: ConfigService<Env, true>) {
    this.cookie = {
      httpOnly: true,
      // The browser only sends it on same-site requests: blocks CSRF on refresh/logout.
      sameSite: 'strict',
      secure: config.get('COOKIE_SECURE', { infer: true }),
      // Only sent to the auth routes, not with every API call.
      path: '/api/auth',
    };
  }

  /** Builds the response body and, for web, sets the cookie. */
  send(res: Response, client: ClientType, tokens: IssuedTokens): AuthResponse {
    const { user, accessToken, refreshToken } = tokens;
    if (client === 'mobile') return { user, accessToken, refreshToken: refreshToken.token };
    res.cookie(REFRESH_COOKIE, refreshToken.token, {
      ...this.cookie,
      expires: refreshToken.expiresAt,
    });
    return { user, accessToken };
  }

  read(req: Request, client: ClientType, body: RefreshRequest | undefined): string | undefined {
    if (client === 'mobile') return body?.refreshToken;
    const value: unknown = (req.cookies as Record<string, unknown> | undefined)?.[REFRESH_COOKIE];
    return typeof value === 'string' && value !== '' ? value : undefined;
  }

  /** The options must match the ones it was set with (path!), or the browser keeps the cookie. */
  clear(res: Response, client: ClientType): void {
    if (client === 'web') res.clearCookie(REFRESH_COOKIE, this.cookie);
  }
}
