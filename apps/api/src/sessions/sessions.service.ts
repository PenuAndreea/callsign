import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { ClientType } from '@callsign/types';
import { Model } from 'mongoose';

import type { RefreshToken } from '../auth/tokens.service';
import type { SessionDocument } from './session.schema';
import { Session } from './session.schema';

/** Data access for `sessions`. Works with token hashes only; `TokensService` makes them. */
@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  constructor(@InjectModel(Session.name) private readonly sessionModel: Model<Session>) {}

  /** Login or register on one device; other devices' sessions are untouched. */
  async create(userId: string, client: ClientType, refreshToken: RefreshToken): Promise<void> {
    await this.sessionModel.create({
      userId,
      client,
      tokenHash: refreshToken.hash,
      expiresAt: refreshToken.expiresAt,
    });
  }

  /**
   * Swaps a valid, unexpired token for the next one in one atomic write, and slides the expiry.
   * Two concurrent refreshes with the same token: only one matches, the other gets `null`.
   *
   * Reuse detection: if the token is the session's *previous* one, the real client already
   * rotated past it, so someone else holds a copy. The whole session is revoked: the thief
   * and the user are both logged out, and the user logs in again.
   */
  async rotate(currentHash: string, next: RefreshToken): Promise<SessionDocument | null> {
    const session = await this.sessionModel
      .findOneAndUpdate(
        { tokenHash: currentHash, expiresAt: { $gt: new Date() } },
        { tokenHash: next.hash, previousTokenHash: currentHash, expiresAt: next.expiresAt },
        { returnDocument: 'after' },
      )
      .exec();
    if (session) return session;

    const reused = await this.sessionModel
      .findOneAndDelete({ previousTokenHash: currentHash })
      .exec();
    if (reused) {
      this.logger.warn(
        `Refresh token reuse: revoked session ${reused.id} of user ${String(reused.userId)}`,
      );
    }
    return null;
  }

  /** Logout on one device. Unknown tokens are a no-op (idempotent). */
  async revoke(tokenHash: string): Promise<void> {
    await this.sessionModel.deleteOne({ tokenHash }).exec();
  }
}
