import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

/**
 * The `users` collection: identity only (sessions live in `sessions`).
 * Shape of the database, not of the API: map to `UserDto` with `toUserDto`.
 * The hash is `select: false`, so queries leave it out unless they ask with `.select('+passwordHash')`.
 */
@Schema({ collection: 'users', timestamps: true })
export class User {
  /** Already trimmed and lowercased by the shared `callsignSchema`; the unique index is case-insensitive in effect. */
  @Prop({ type: String, required: true, unique: true })
  callsign!: string;

  @Prop({ type: String, required: true, select: false })
  passwordHash!: string;

  // Set by `timestamps: true`.
  createdAt!: Date;
  updatedAt!: Date;
}

export type UserDocument = HydratedDocument<User>;

export const UserSchema = SchemaFactory.createForClass(User);
