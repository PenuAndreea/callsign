import { roomDtoSchema } from '@callsign/types';
import { Types } from 'mongoose';

import { toRoomDto } from './rooms.mapper';

const _id = new Types.ObjectId();
const createdAt = new Date('2026-10-15T20:00:00.000Z');
const room = { _id, name: 'tower', memberCount: 2, lastMessage: null, createdAt };

describe('toRoomDto', () => {
  it('maps a room without messages', () => {
    expect(toRoomDto(room, false)).toEqual({
      id: _id.toHexString(),
      name: 'tower',
      memberCount: 2,
      isMember: false,
      lastMessage: null,
      createdAt: '2026-10-15T20:00:00.000Z',
    });
  });

  it('maps the last message preview and leaves the sender id out', () => {
    const lastMessage = {
      content: 'Radio check. Over.',
      senderId: new Types.ObjectId(),
      createdAt: new Date('2026-10-15T22:14:00.000Z'),
    };
    const dto = toRoomDto({ ...room, lastMessage }, true);
    expect(dto.lastMessage).toEqual({
      content: 'Radio check. Over.',
      createdAt: '2026-10-15T22:14:00.000Z',
    });
    expect(dto.isMember).toBe(true);
  });

  it('produces a valid RoomDto and drops every other field', () => {
    const doc = { ...room, createdBy: new Types.ObjectId(), updatedAt: new Date(), __v: 0 };
    const dto = toRoomDto(doc, true);
    expect(roomDtoSchema.parse(dto)).toEqual(dto);
    expect(Object.keys(dto).sort()).toEqual([
      'createdAt',
      'id',
      'isMember',
      'lastMessage',
      'memberCount',
      'name',
    ]);
  });
});
