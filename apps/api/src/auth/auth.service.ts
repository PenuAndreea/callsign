import { HttpStatus, Injectable } from '@nestjs/common';
import type { ClientType, LoginRequest, RegisterRequest, UserDto } from '@callsign/types';

import { ApiException } from '../common/errors/api.exception';
import { SessionsService } from '../sessions/sessions.service';
import type { UserDocument } from '../users/user.schema';
import { toUserDto } from '../users/users.mapper';
import { UsersService } from '../users/users.service';
import { PasswordHasher } from './password-hasher.service';
import type { RefreshToken } from './tokens.service';
import { TokensService } from './tokens.service';

/** A fresh token pair. The controller decides how the refresh token travels (cookie or body). */
export interface IssuedTokens {
  user: UserDto;
  accessToken: string;
  refreshToken: RefreshToken;
}

/**
 * Auth flows. Transport-agnostic: no cookies or headers here.
 * One session per device (`sessions`), so logging in on one device never logs out another.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly sessions: SessionsService,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokensService,
  ) {}

  /** Registering logs you in. @throws 409 `CALLSIGN_TAKEN` */
  async register(
    { callsign, passphrase }: RegisterRequest,
    client: ClientType,
  ): Promise<IssuedTokens> {
    const user = await this.users.create(callsign, await this.hasher.hash(passphrase));
    return this.startSession(user, client);
  }

  /** @throws 401 `INVALID_CREDENTIALS`, the same for an unknown callsign and a wrong passphrase. */
  async login({ callsign, passphrase }: LoginRequest, client: ClientType): Promise<IssuedTokens> {
    const user = await this.users.findByCallsignWithPassword(callsign);
    // Always verify (against a dummy hash for unknown callsigns), so timing reveals nothing.
    const valid = await this.hasher.verify(user?.passwordHash, passphrase);
    if (!user || !valid) {
      throw new ApiException(
        HttpStatus.UNAUTHORIZED,
        'INVALID_CREDENTIALS',
        'Callsign or passphrase is incorrect',
      );
    }
    return this.startSession(user, client);
  }

  /**
   * Rotates the refresh token and slides the session's expiry. A missing, unknown, reused or
   * expired token: 401 `UNAUTHORIZED` (a reused one also revokes its session).
   */
  async refresh(refreshToken: string | undefined): Promise<IssuedTokens> {
    if (!refreshToken) throw unauthorized('Missing refresh token');
    const next = this.tokens.createRefreshToken();
    const session = await this.sessions.rotate(
      this.tokens.hashRefreshToken(refreshToken),
      next,
      this.tokens.refreshReuseGraceMs(),
    );
    if (!session) throw unauthorized('Invalid or expired refresh token');
    const user = await this.users.findById(session.userId.toHexString());
    if (!user) throw unauthorized('User not found');
    return this.issue(user, next);
  }

  /** Ends this device's session only. Idempotent: no token or an unknown one is not an error. */
  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;
    await this.sessions.revoke(this.tokens.hashRefreshToken(refreshToken));
  }

  /** @throws 401 when the token's user no longer exists. */
  async me(userId: string): Promise<UserDto> {
    const user = await this.users.findById(userId);
    if (!user) throw unauthorized('User not found');
    return toUserDto(user);
  }

  private async startSession(user: UserDocument, client: ClientType): Promise<IssuedTokens> {
    const refreshToken = this.tokens.createRefreshToken();
    await this.sessions.create(user.id, client, refreshToken);
    return this.issue(user, refreshToken);
  }

  private async issue(user: UserDocument, refreshToken: RefreshToken): Promise<IssuedTokens> {
    const dto = toUserDto(user);
    const accessToken = await this.tokens.signAccessToken({ id: dto.id, callsign: dto.callsign });
    return { user: dto, accessToken, refreshToken };
  }
}

function unauthorized(message: string): ApiException {
  return new ApiException(HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED', message);
}
