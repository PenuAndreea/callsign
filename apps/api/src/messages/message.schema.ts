import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes } from 'mongoose';
import type { HydratedDocument, Types } from 'mongoose';

import { Room } from '../rooms/room.schema';
import { User } from '../users/user.schema';

/**
 * The `messages` collection. Messages are never edited, so there is no `updatedAt`.
 * Shape of the database, not of the API: map to `MessageDto` with `toMessageDto`.
 */
@Schema({ collection: 'messages', timestamps: { createdAt: true, updatedAt: false } })
export class Message {
  @Prop({ type: SchemaTypes.ObjectId, ref: Room.name, required: true })
  roomId!: Types.ObjectId;

  /** From the sender's access token, never from the client. */
  @Prop({ type: SchemaTypes.ObjectId, ref: User.name, required: true })
  senderId!: Types.ObjectId;

  /**
   * Copied at send time. Callsigns never change, so history needs no lookup in `users`
   * (no `$lookup` or `populate` per page).
   */
  @Prop({ type: String, required: true })
  senderCallsign!: string;

  /** Already trimmed and length-checked by the shared `messageContentSchema`. */
  @Prop({ type: String, required: true })
  content!: string;

  /** Idempotency key from the client (`clientMessageIdSchema`), when it sent one. */
  @Prop({ type: String })
  clientMessageId?: string;

  // Set by `timestamps` (milliseconds; the `_id` timestamp only has seconds).
  createdAt!: Date;
}

export type MessageDocument = HydratedDocument<Message>;

export const MessageSchema = SchemaFactory.createForClass(Message);

// Paginated history: equality on `roomId`, then walks `_id` newest first from the cursor.
// `_id` is unique and grows with time, so the cursor has no ties. Also serves any lookup
// by `roomId` alone (an index prefix).
MessageSchema.index({ roomId: 1, _id: -1 });

// Idempotent sends: a retry with the same key cannot insert a second copy, even when two
// retries race (the index decides, not a "find, then insert"). Scoped to the sender and the
// net, so one station's key never collides with another's and a reused key in another net is
// just a new message. Partial: messages without a key are not in the index at all.
MessageSchema.index(
  { senderId: 1, roomId: 1, clientMessageId: 1 },
  { unique: true, partialFilterExpression: { clientMessageId: { $type: 'string' } } },
);
