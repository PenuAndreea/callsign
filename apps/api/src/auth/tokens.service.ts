import { createHash, randomBytes } from 'node:crypto';

import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { ApiException } from '../common/errors/api.exception';
import type { Env } from '../config/env.schema';
import type { AuthUser } from './auth-user';
import { accessTokenPayloadSchema } from './auth-user';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface RefreshToken {
  /** Sent to the client once (cookie or body); never stored. */
  token: string;
  /** What the database keeps. */
  hash: string;
  expiresAt: Date;
}

/**
 * Both kinds of token. The access token is a short-lived JWT the API can check without a
 * database lookup; the refresh token is an opaque random string checked against its stored hash.
 */
@Injectable()
export class TokensService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  signAccessToken(user: { id: string; callsign: string }): Promise<string> {
    return this.jwt.signAsync({ sub: user.id, callsign: user.callsign });
  }

  /**
   * Shared by the HTTP guard and (M4) the Socket.IO handshake.
   * @throws ApiException 401 `UNAUTHORIZED` for a bad signature, an expired token or unexpected claims.
   */
  async verifyAccessToken(token: string): Promise<AuthUser> {
    let payload: unknown;
    try {
      payload = await this.jwt.verifyAsync<object>(token);
    } catch {
      throw unauthorized();
    }
    const claims = accessTokenPayloadSchema.safeParse(payload);
    if (!claims.success) throw unauthorized();
    return { userId: claims.data.sub, callsign: claims.data.callsign };
  }

  /** 32 random bytes: unguessable, so a fast SHA-256 is enough to store it (no argon2 needed). */
  /** How long a rotated-away refresh token still refreshes (`REFRESH_REUSE_GRACE_SECONDS`). */
  refreshReuseGraceMs(): number {
    return this.config.get('REFRESH_REUSE_GRACE_SECONDS', { infer: true }) * 1000;
  }

  createRefreshToken(): RefreshToken {
    const token = randomBytes(32).toString('base64url');
    const days = this.config.get('REFRESH_TOKEN_TTL_DAYS', { infer: true });
    return {
      token,
      hash: this.hashRefreshToken(token),
      expiresAt: new Date(Date.now() + days * DAY_MS),
    };
  }

  /** Deterministic, so the stored hash can be looked up by the token the client sends. */
  hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}

function unauthorized(): ApiException {
  return new ApiException(HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED', 'Invalid or expired token');
}
