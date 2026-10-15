import type { RoomDto } from '@callsign/types';
import type { Types } from 'mongoose';

import type { Room } from './room.schema';

/**
 * Document → API shape. `isMember` is not stored on the room: it depends on who asks,
 * so the caller passes it. `lastMessage.senderId` stays internal.
 */
export function toRoomDto(
  room: Pick<Room, 'name' | 'memberCount' | 'lastMessage' | 'createdAt'> & { _id: Types.ObjectId },
  isMember: boolean,
): RoomDto {
  return {
    id: room._id.toHexString(),
    name: room.name,
    memberCount: room.memberCount,
    isMember,
    lastMessage: room.lastMessage
      ? {
          content: room.lastMessage.content,
          createdAt: room.lastMessage.createdAt.toISOString(),
        }
      : null,
    createdAt: room.createdAt.toISOString(),
  };
}
