import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { isDuplicateKeyError } from '../common/mongo/is-duplicate-key-error';
import { Membership } from './membership.schema';

/**
 * Data access for `memberships`: who is in which net. Callers pass valid ids (the user id
 * comes from the token; `RoomsService` checks the room exists first). Keeping `memberCount`
 * in step is `RoomsService`'s job, using the booleans returned here.
 */
@Injectable()
export class MembershipsService {
  constructor(@InjectModel(Membership.name) private readonly membershipModel: Model<Membership>) {}

  /**
   * Joins the net. `false` when the user was already a member: the unique index decides,
   * so two concurrent joins insert one row and only one caller gets `true`.
   */
  async add(userId: string, roomId: string): Promise<boolean> {
    try {
      await this.membershipModel.create({ userId, roomId });
      return true;
    } catch (error) {
      if (isDuplicateKeyError(error, 'roomId')) return false;
      throw error;
    }
  }

  /** Leaves the net. `false` when the user was not a member (nothing deleted). */
  async remove(userId: string, roomId: string): Promise<boolean> {
    const { deletedCount } = await this.membershipModel.deleteOne({ userId, roomId }).exec();
    return deletedCount === 1;
  }

  async isMember(userId: string, roomId: string): Promise<boolean> {
    return (await this.membershipModel.exists({ userId, roomId }).exec()) !== null;
  }

  /**
   * Ids of every net the user is in. Covered by the `{ userId, roomId }` index:
   * MongoDB answers from the index alone and never reads the documents.
   */
  async roomIdsFor(userId: string): Promise<Types.ObjectId[]> {
    const rows = await this.membershipModel
      .find({ userId }, { _id: 0, roomId: 1 })
      .lean<{ roomId: Types.ObjectId }[]>()
      .exec();
    return rows.map((row) => row.roomId);
  }
}
