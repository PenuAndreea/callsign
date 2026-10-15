import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isObjectIdOrHexString, Model } from 'mongoose';

import { ApiException } from '../common/errors/api.exception';
import { isDuplicateKeyError } from '../common/mongo/is-duplicate-key-error';
import type { UserDocument } from './user.schema';
import { User } from './user.schema';

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
}
