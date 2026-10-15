import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes } from 'mongoose';
import type { HydratedDocument, Types } from 'mongoose';

import { User } from '../users/user.schema';

/** Denormalized preview of the newest message, for the nets list. Written by the messages service (M4). */
@Schema({ _id: false })
export class RoomLastMessage {
  /** Cut to ~80 characters: a preview, not the message. */
  @Prop({ type: String, required: true })
  content!: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: User.name, required: true })
  senderId!: Types.ObjectId;

  @Prop({ type: Date, required: true })
  createdAt!: Date;
}

export const RoomLastMessageSchema = SchemaFactory.createForClass(RoomLastMessage);

/**
 * The `rooms` collection (nets). Members live in `memberships`, not in an array here.
 * Shape of the database, not of the API: map to `RoomDto` with `toRoomDto`.
 */
@Schema({ collection: 'rooms', timestamps: true })
export class Room {
  /** Already trimmed and lowercased by the shared `roomNameSchema`; the unique index is case-insensitive in effect. */
  @Prop({ type: String, required: true, unique: true })
  name!: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: User.name, required: true })
  createdBy!: Types.ObjectId;

  /**
   * Denormalized count of `memberships` rows, so the nets list needs no count per room.
   * Only `RoomsService` changes it, with `$inc`, and only when a membership row was really
   * added or removed. `min` guards `save()`/`create()`; `$inc` updates skip validators.
   */
  @Prop({ type: Number, required: true, default: 0, min: 0 })
  memberCount!: number;

  @Prop({ type: RoomLastMessageSchema, default: null })
  lastMessage!: RoomLastMessage | null;

  // Set by `timestamps: true`.
  createdAt!: Date;
  updatedAt!: Date;
}

export type RoomDocument = HydratedDocument<Room>;

export const RoomSchema = SchemaFactory.createForClass(Room);
