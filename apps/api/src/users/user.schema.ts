import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

/**
 * The `users` collection. Shape of the database, not of the API: map to `UserDto` with `toUserDto`.
 * Secrets are `select: false`, so queries leave them out unless they ask with `.select('+field')`.
 */
@Schema({ collection: 'users', timestamps: true })
export class User {
  /** Already trimmed and lowercased by the shared `callsignSchema`; the unique index is case-insensitive in effect. */
  @Prop({ type: String, required: true, unique: true })
  callsign!: string;

  @Prop({ type: String, required: true, select: false })
  passwordHash!: string;

  /** SHA-256 of the current refresh token; `null` when logged out. One session per user in v1. */
  @Prop({ type: String, default: null, select: false })
  refreshTokenHash!: string | null;

  @Prop({ type: Date, default: null, select: false })
  refreshTokenExpiresAt!: Date | null;

  // Set by `timestamps: true`.
  createdAt!: Date;
  updatedAt!: Date;
}

export type UserDocument = HydratedDocument<User>;

export const UserSchema = SchemaFactory.createForClass(User);

// Refresh looks the user up by token hash. Partial, not sparse: a sparse index still indexes
// `null`, so every logged-out user would collide on the unique constraint.
UserSchema.index(
  { refreshTokenHash: 1 },
  { unique: true, partialFilterExpression: { refreshTokenHash: { $type: 'string' } } },
);
