import { HttpStatus, Injectable } from '@nestjs/common';
import type { ClientType, LoginRequest, RegisterRequest, UserDto } from '@callsign/types';

import { ApiException } from '../common/errors/api.exception';
import type { RequestOrigin } from '../common/security/security-event';
import { SecurityLog } from '../common/security/security-log.service';
import { RealtimeService } from '../realtime/realtime.service';
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
    private readonly securityLog: SecurityLog,
    private readonly realtime: RealtimeService,
  ) {}

  /** Registering logs you in. @throws 409 `CALLSIGN_TAKEN` */
  async register(
    { callsign, passphrase }: RegisterRequest,
    client: ClientType,
  ): Promise<IssuedTokens> {
    const user = await this.users.create(callsign, await this.hasher.hash(passphrase));
    return this.startSession(user, client);
  }

  /**
   * Every attempt goes to the security log, with the real reason for a failure; the response
   * does not tell them apart.
   * @throws 401 `INVALID_CREDENTIALS`, the same for an unknown callsign and a wrong passphrase.
   */
  async login(
    { callsign, passphrase }: LoginRequest,
    origin: RequestOrigin,
  ): Promise<IssuedTokens> {
    const user = await this.users.findByCallsignWithPassword(callsign);
    // Always verify (against a dummy hash for unknown callsigns), so timing reveals nothing.
    const valid = await this.hasher.verify(user?.passwordHash, passphrase);
    if (!user || !valid) {
      const reason = user ? 'wrong_passphrase' : 'unknown_callsign';
      this.securityLog.record({ event: 'login_failed', callsign, reason, ...origin });
      throw new ApiException(
        HttpStatus.UNAUTHORIZED,
        'INVALID_CREDENTIALS',
        'Callsign or passphrase is incorrect',
      );
    }
    this.securityLog.record({ event: 'login_succeeded', userId: user.id, callsign, ...origin });
    return this.startSession(user, origin.client);
  }

  /**
   * Rotates the refresh token and slides the session's expiry. A missing, unknown, reused or
   * expired token: 401 `UNAUTHORIZED`. A reused one also revokes its session and closes the
   * session's sockets, the thief's included.
   */
  async refresh(refreshToken: string | undefined): Promise<IssuedTokens> {
    if (!refreshToken) throw unauthorized('Missing refresh token');
    const next = this.tokens.createRefreshToken();
    const result = await this.sessions.rotate(
      this.tokens.hashRefreshToken(refreshToken),
      next,
      this.tokens.refreshReuseGraceMs(),
    );
    if (result.status === 'reused') this.realtime.endSession(result.sessionId);
    if (result.status !== 'rotated') throw unauthorized('Invalid or expired refresh token');
    const { session } = result;
    const user = await this.users.findById(session.userId.toHexString());
    if (!user) throw unauthorized('User not found');
    return this.issue(user, next, session.id);
  }

  /**
   * Ends this device's session only, and closes its sockets: the handshake checks the token
   * once, so an open socket would otherwise keep receiving messages.
   * Idempotent: no token or an unknown one is not an error.
   */
  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;
    const sessionId = await this.sessions.revoke(this.tokens.hashRefreshToken(refreshToken));
    if (sessionId) this.realtime.endSession(sessionId);
  }

  /** @throws 401 when the token's user no longer exists. */
  async me(userId: string): Promise<UserDto> {
    const user = await this.users.findById(userId);
    if (!user) throw unauthorized('User not found');
    return toUserDto(user);
  }

  private async startSession(user: UserDocument, client: ClientType): Promise<IssuedTokens> {
    const refreshToken = this.tokens.createRefreshToken();
    const sessionId = await this.sessions.create(user.id, client, refreshToken);
    return this.issue(user, refreshToken, sessionId);
  }

  private async issue(
    user: UserDocument,
    refreshToken: RefreshToken,
    sessionId: string,
  ): Promise<IssuedTokens> {
    const dto = toUserDto(user);
    const accessToken = await this.tokens.signAccessToken(
      { id: dto.id, callsign: dto.callsign },
      sessionId,
    );
    return { user: dto, accessToken, refreshToken };
  }
}

function unauthorized(message: string): ApiException {
  return new ApiException(HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED', message);
}
