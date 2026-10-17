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
   *
   * Grace window (`graceMs` after a rotation): the *previous* token still refreshes. That is a
   * client that never got the last response (a reload mid-refresh), or the loser of two
   * concurrent refreshes with the same token. It gets a new token too; the window is not
   * extended (`rotatedAt` and `previousTokenHash` stay), so an old token cannot be kept alive.
   *
   * Reuse detection, after the window: the previous token means the real client rotated past it
   * long ago, so someone else holds a copy. The whole session is revoked: the thief and the
   * user are both logged out, and the user logs in again.
   */
  async rotate(
    currentHash: string,
    next: RefreshToken,
    graceMs = 0,
  ): Promise<SessionDocument | null> {
    const now = new Date();
    const session = await this.sessionModel
      .findOneAndUpdate(
        { tokenHash: currentHash, expiresAt: { $gt: now } },
        {
          tokenHash: next.hash,
          previousTokenHash: currentHash,
          rotatedAt: now,
          expiresAt: next.expiresAt,
        },
        { returnDocument: 'after' },
      )
      .exec();
    if (session) return session;

    if (graceMs > 0) {
      const retried = await this.sessionModel
        .findOneAndUpdate(
          {
            previousTokenHash: currentHash,
            rotatedAt: { $gt: new Date(now.getTime() - graceMs) },
            expiresAt: { $gt: now },
          },
          { tokenHash: next.hash, expiresAt: next.expiresAt },
          { returnDocument: 'after' },
        )
        .exec();
      if (retried) return retried;
    }

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
