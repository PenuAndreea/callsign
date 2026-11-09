import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

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
   * Joins the net. `false` when the user was already a member. An upsert, not an insert that
   * catches the duplicate key: it reports the outcome without failing, so it can run inside a
   * transaction (a failed write aborts one). Two concurrent joins still insert one row, and only
   * one caller gets `true`: the server retries an upsert that hits the unique index, and inside
   * a transaction the loser gets a write conflict and `TransactionRunner` reruns it.
   */
  async add(userId: string, roomId: string): Promise<boolean> {
    const { upsertedCount } = await this.membershipModel
      .updateOne(
        { userId, roomId },
        // The filter's fields go into the new row on their own; `joinedAt` comes from `timestamps`.
        { $setOnInsert: { userId, roomId } },
        { upsert: true },
      )
      .exec();
    return upsertedCount === 1;
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
