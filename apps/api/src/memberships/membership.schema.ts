import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes } from 'mongoose';
import type { HydratedDocument, Types } from 'mongoose';

import { Room } from '../rooms/room.schema';
import { User } from '../users/user.schema';

/**
 * The `memberships` collection: one row per user in a net. A join collection instead of a
 * members array on the room, so a room document never grows with its member count and
 * "which nets am I in" is one indexed query.
 */
@Schema({ collection: 'memberships', timestamps: { createdAt: 'joinedAt', updatedAt: false } })
export class Membership {
  @Prop({ type: SchemaTypes.ObjectId, ref: User.name, required: true })
  userId!: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: Room.name, required: true })
  roomId!: Types.ObjectId;

  // Set by `timestamps` (renamed from `createdAt`).
  joinedAt!: Date;
}

export type MembershipDocument = HydratedDocument<Membership>;

export const MembershipSchema = SchemaFactory.createForClass(Membership);

// Unique: a user is in a net at most once, even when two joins race. Also serves every
// lookup by `userId` alone (an index prefix), so `userId` needs no index of its own.
MembershipSchema.index({ userId: 1, roomId: 1 }, { unique: true });
// The members of one net (socket room sync in M4).
MembershipSchema.index({ roomId: 1 });
