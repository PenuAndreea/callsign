import { describe, expect, it } from 'vitest';

import {
  MESSAGE_CONTENT_MAX,
  messageContentSchema,
  messageDtoSchema,
  messagePageSchema,
  sendMessageRequestSchema,
} from '../messages';

const ROOM_ID = '6650c0ffee0000000000abcd';
const CLIENT_MESSAGE_ID = '8f14e45f-ceea-4e7a-9c1d-2b3f1a6e7d90';

const message = {
  id: '6650c0ffee0000000000beef',
  roomId: ROOM_ID,
  sender: { id: '6650c0ffee0000000000f00d', callsign: 'wolf-2' },
  content: 'Radio check. Over.',
  createdAt: '2026-10-17T22:14:00.000Z',
};

describe('messageContentSchema', () => {
  it('trims the content', () => {
    expect(messageContentSchema.parse('  Radio check. Over.  ')).toBe('Radio check. Over.');
  });

  it('accepts 1 and the maximum number of characters', () => {
    expect(messageContentSchema.safeParse('k').success).toBe(true);
    expect(messageContentSchema.safeParse('a'.repeat(MESSAGE_CONTENT_MAX)).success).toBe(true);
  });

  it('rejects empty, whitespace-only and too long content', () => {
    expect(messageContentSchema.safeParse('').success).toBe(false);
    expect(messageContentSchema.safeParse(' \n\t ').success).toBe(false);
    expect(messageContentSchema.safeParse('a'.repeat(MESSAGE_CONTENT_MAX + 1)).success).toBe(false);
  });
});

describe('sendMessageRequestSchema', () => {
  it('parses a room id and normalized content', () => {
    expect(sendMessageRequestSchema.parse({ roomId: ROOM_ID, content: ' Over. ' })).toEqual({
      roomId: ROOM_ID,
      content: 'Over.',
    });
  });

  it('rejects a malformed room id', () => {
    expect(sendMessageRequestSchema.safeParse({ roomId: 'tower', content: 'Over.' }).success).toBe(
      false,
    );
  });

  it('accepts an optional client message id and lowercases it', () => {
    const parsed = sendMessageRequestSchema.parse({
      roomId: ROOM_ID,
      content: 'Over.',
      clientMessageId: CLIENT_MESSAGE_ID.toUpperCase(),
    });
    expect(parsed.clientMessageId).toBe(CLIENT_MESSAGE_ID);
  });

  it('rejects a client message id that is not a UUID', () => {
    const payload = { roomId: ROOM_ID, content: 'Over.', clientMessageId: 'msg-1' };
    expect(sendMessageRequestSchema.safeParse(payload).success).toBe(false);
  });

  it('drops a sender sent by the client', () => {
    const parsed = sendMessageRequestSchema.parse({
      roomId: ROOM_ID,
      content: 'Over.',
      senderId: 'someone-else',
    });
    expect(parsed).not.toHaveProperty('senderId');
  });
});

describe('messageDtoSchema', () => {
  it('accepts a message', () => {
    expect(messageDtoSchema.parse(message)).toEqual(message);
  });

  it('accepts a message with the client message id of its send', () => {
    const withKey = { ...message, clientMessageId: CLIENT_MESSAGE_ID };
    expect(messageDtoSchema.parse(withKey)).toEqual(withKey);
  });

  it('rejects a date that is not ISO 8601', () => {
    expect(messageDtoSchema.safeParse({ ...message, createdAt: '22:14Z' }).success).toBe(false);
  });

  it('rejects a message without a sender', () => {
    const { sender: _sender, ...withoutSender } = message;
    expect(messageDtoSchema.safeParse(withoutSender).success).toBe(false);
  });
});

describe('messagePageSchema', () => {
  it('accepts a page of messages', () => {
    const page = { items: [message], nextCursor: 'abc' };
    expect(messagePageSchema.parse(page)).toEqual(page);
  });
});
