import { HttpStatus, Injectable } from '@nestjs/common';
import type { LoginRequest, RegisterRequest, UserDto } from '@callsign/types';

import { ApiException } from '../common/errors/api.exception';
import type { UserDocument } from '../users/user.schema';
import { toUserDto } from '../users/users.mapper';
import { UsersService } from '../users/users.service';
import { PasswordHasher } from './password-hasher.service';
import type { RefreshToken } from './tokens.service';
import { TokensService } from './tokens.service';

/** A fresh token pair. The controller decides how the refresh token travels (cookie or body). */
export interface Session {
  user: UserDto;
  accessToken: string;
  refreshToken: RefreshToken;
}

/**
 * Auth flows. Transport-agnostic: no cookies or headers here.
 * v1 keeps one session per user, so a new login (any device) ends the previous one.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokensService,
  ) {}

  /** Registering logs you in. @throws 409 `CALLSIGN_TAKEN` */
  async register({ callsign, passphrase }: RegisterRequest): Promise<Session> {
    const user = await this.users.create(callsign, await this.hasher.hash(passphrase));
    return this.startSession(user);
  }

  /** @throws 401 `INVALID_CREDENTIALS`, the same for an unknown callsign and a wrong passphrase. */
  async login({ callsign, passphrase }: LoginRequest): Promise<Session> {
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
    return this.startSession(user);
  }

  /** Rotates the refresh token. A missing, unknown, reused or expired one: 401 `UNAUTHORIZED`. */
  async refresh(refreshToken: string | undefined): Promise<Session> {
    if (!refreshToken) throw unauthorized('Missing refresh token');
    const next = this.tokens.createRefreshToken();
    const user = await this.users.rotateRefreshToken(
      this.tokens.hashRefreshToken(refreshToken),
      next.hash,
      next.expiresAt,
    );
    if (!user) throw unauthorized('Invalid or expired refresh token');
    return this.toSession(user, next);
  }

  /** Idempotent: no token or an unknown one is not an error. */
  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;
    await this.users.clearRefreshToken(this.tokens.hashRefreshToken(refreshToken));
  }

  /** @throws 401 when the token's user no longer exists. */
  async me(userId: string): Promise<UserDto> {
    const user = await this.users.findById(userId);
    if (!user) throw unauthorized('User not found');
    return toUserDto(user);
  }

  private async startSession(user: UserDocument): Promise<Session> {
    const refreshToken = this.tokens.createRefreshToken();
    await this.users.setRefreshToken(user.id, refreshToken.hash, refreshToken.expiresAt);
    return this.toSession(user, refreshToken);
  }

  private async toSession(user: UserDocument, refreshToken: RefreshToken): Promise<Session> {
    const dto = toUserDto(user);
    const accessToken = await this.tokens.signAccessToken({ id: dto.id, callsign: dto.callsign });
    return { user: dto, accessToken, refreshToken };
  }
}

function unauthorized(message: string): ApiException {
  return new ApiException(HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED', message);
}
