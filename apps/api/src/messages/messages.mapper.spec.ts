import { messageDtoSchema } from '@callsign/types';
import { Types } from 'mongoose';

import { toMessageDto } from './messages.mapper';

const _id = new Types.ObjectId();
const roomId = new Types.ObjectId();
const senderId = new Types.ObjectId();
const message = {
  _id,
  roomId,
  senderId,
  senderCallsign: 'wolf-2',
  content: 'Radio check. Over.',
  createdAt: new Date('2026-10-17T22:14:00.000Z'),
};

describe('toMessageDto', () => {
  it('maps ids to strings and builds the sender from the stored callsign', () => {
    expect(toMessageDto(message)).toEqual({
      id: _id.toHexString(),
      roomId: roomId.toHexString(),
      sender: { id: senderId.toHexString(), callsign: 'wolf-2' },
      content: 'Radio check. Over.',
      createdAt: '2026-10-17T22:14:00.000Z',
    });
  });

  it('produces a valid MessageDto and drops every other field', () => {
    const doc = { ...message, __v: 0 };
    const dto = toMessageDto(doc);
    expect(messageDtoSchema.parse(dto)).toEqual(dto);
    expect(Object.keys(dto).sort()).toEqual(['content', 'createdAt', 'id', 'roomId', 'sender']);
  });

  it('echoes the client message id when the send had one', () => {
    const clientMessageId = '8f14e45f-ceea-4e7a-9c1d-2b3f1a6e7d90';
    expect(toMessageDto({ ...message, clientMessageId })).toMatchObject({ clientMessageId });
  });
});
