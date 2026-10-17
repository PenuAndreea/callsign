import type { MessageDto } from '@callsign/types';
import type { Types } from 'mongoose';

import type { Message } from './message.schema';

/** Document → API shape. The sender is built from the stored copy, without a user lookup. */
export function toMessageDto(
  message: Pick<Message, 'roomId' | 'senderId' | 'senderCallsign' | 'content' | 'createdAt'> & {
    _id: Types.ObjectId;
  },
): MessageDto {
  return {
    id: message._id.toHexString(),
    roomId: message.roomId.toHexString(),
    sender: { id: message.senderId.toHexString(), callsign: message.senderCallsign },
    content: message.content,
    createdAt: message.createdAt.toISOString(),
  };
}
