import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { ClientType } from '@callsign/types';
import { SchemaTypes } from 'mongoose';
import type { HydratedDocument, Types } from 'mongoose';

import { User } from '../users/user.schema';

/**
 * The `sessions` collection: one row per logged-in device, so web and mobile stay
 * logged in side by side. Only hashes are stored, never the refresh tokens themselves.
 */
@Schema({ collection: 'sessions', timestamps: true })
export class Session {
  // `SchemaTypes.ObjectId` (the schema type), not `Types.ObjectId` (the value class):
  // with the latter, Mongoose does not cast the field and `userId` is not a real ObjectId.
  @Prop({ type: SchemaTypes.ObjectId, ref: User.name, required: true, index: true })
  userId!: Types.ObjectId;

  /** SHA-256 of the current refresh token. */
  @Prop({ type: String, required: true, unique: true })
  tokenHash!: string;

  /** Hash of the token this one replaced: presenting it again means it was stolen (reuse detection). */
  @Prop({ type: String, default: null })
  previousTokenHash!: string | null;

  /** Sliding: every refresh moves it forward. MongoDB deletes the row once it passes (TTL index). */
  @Prop({ type: Date, required: true })
  expiresAt!: Date;

  @Prop({ type: String, enum: ['web', 'mobile'], required: true })
  client!: ClientType;

  // Set by `timestamps: true`.
  createdAt!: Date;
  updatedAt!: Date;
}

export type SessionDocument = HydratedDocument<Session>;

export const SessionSchema = SchemaFactory.createForClass(Session);

// TTL index: a background job in MongoDB deletes rows whose `expiresAt` has passed (it runs
// about once a minute, so queries still filter on `expiresAt` themselves).
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
// Reuse detection looks sessions up by the previous hash. Partial: most rows start with `null`.
SessionSchema.index(
  { previousTokenHash: 1 },
  { partialFilterExpression: { previousTokenHash: { $type: 'string' } } },
);
