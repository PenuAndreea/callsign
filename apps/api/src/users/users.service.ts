import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isObjectIdOrHexString, Model } from 'mongoose';

import { ApiException } from '../common/errors/api.exception';
import { isDuplicateKeyError } from '../common/mongo/is-duplicate-key-error';
import type { UserDocument } from './user.schema';
import { User } from './user.schema';

const NO_SESSION = { refreshTokenHash: null, refreshTokenExpiresAt: null };

/**
 * Data access for `users`. Callers pass values already parsed by the shared schemas
 * (callsigns trimmed and lowercased). Hashing happens in `auth`, never here.
 */
@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<User>) {}

  /** @throws ApiException 409 `CALLSIGN_TAKEN` (from the unique index, so it is race-safe). */
  async create(callsign: string, passwordHash: string): Promise<UserDocument> {
    try {
      return await this.userModel.create({ callsign, passwordHash });
    } catch (error) {
      if (isDuplicateKeyError(error, 'callsign')) {
        throw new ApiException(HttpStatus.CONFLICT, 'CALLSIGN_TAKEN', 'Callsign is already taken');
      }
      throw error;
    }
  }

  /** `null` for an unknown or malformed id. */
  async findById(id: string): Promise<UserDocument | null> {
    if (!isObjectIdOrHexString(id)) return null;
    return this.userModel.findById(id).exec();
  }

  /** For login only: includes `passwordHash`. */
  async findByCallsignWithPassword(callsign: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ callsign }).select('+passwordHash').exec();
  }

  /** Starts a session (login, register): replaces any previous refresh token. */
  async setRefreshToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    await this.userModel
      .updateOne({ _id: userId }, { refreshTokenHash: tokenHash, refreshTokenExpiresAt: expiresAt })
      .exec();
  }

  /**
   * Swaps a valid, unexpired refresh token for a new one in a single atomic write.
   * Two concurrent refreshes with the same token: only one matches, the other gets `null`.
   * A reused (already rotated) or expired token also gets `null`.
   */
  async rotateRefreshToken(
    currentHash: string,
    nextHash: string,
    nextExpiresAt: Date,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findOneAndUpdate(
        { refreshTokenHash: currentHash, refreshTokenExpiresAt: { $gt: new Date() } },
        { refreshTokenHash: nextHash, refreshTokenExpiresAt: nextExpiresAt },
        { returnDocument: 'after' },
      )
      .exec();
  }

  /** Logout: ends the session that owns this token. Unknown tokens are a no-op (idempotent). */
  async clearRefreshToken(tokenHash: string): Promise<void> {
    await this.userModel.updateOne({ refreshTokenHash: tokenHash }, NO_SESSION).exec();
  }
}
