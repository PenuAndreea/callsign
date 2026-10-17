import { describe, expect, expectTypeOf, it } from 'vitest';

import type { MessageDto, SendMessageRequest } from '../messages';
import type { ClientToServerEvents, SendMessageAck, ServerToClientEvents } from '../socket';
import { roomUpdatedEventSchema, sendMessageAckSchema } from '../socket';

const message: MessageDto = {
  id: '6650c0ffee0000000000beef',
  roomId: '6650c0ffee0000000000abcd',
  sender: { id: '6650c0ffee0000000000f00d', callsign: 'wolf-2' },
  content: 'Radio check. Over.',
  createdAt: '2026-10-17T22:14:00.000Z',
};

describe('sendMessageAckSchema', () => {
  it('accepts a success with the saved message', () => {
    const ack = { ok: true, message };
    expect(sendMessageAckSchema.parse(ack)).toEqual(ack);
  });

  it('accepts a failure with an ApiError', () => {
    const ack = {
      ok: false,
      error: { statusCode: 403, code: 'NOT_A_MEMBER', message: 'Join the net first' },
    };
    expect(sendMessageAckSchema.parse(ack)).toEqual(ack);
  });

  it('rejects a success without a message and a failure without an error', () => {
    expect(sendMessageAckSchema.safeParse({ ok: true }).success).toBe(false);
    expect(sendMessageAckSchema.safeParse({ ok: false, message }).success).toBe(false);
  });

  it('narrows on ok', () => {
    const ack = sendMessageAckSchema.parse({ ok: true, message });
    if (ack.ok) expectTypeOf(ack.message).toEqualTypeOf<MessageDto>();
  });
});

describe('roomUpdatedEventSchema', () => {
  it('accepts an id and a member count', () => {
    expect(roomUpdatedEventSchema.parse({ id: 'abc', memberCount: 0 })).toEqual({
      id: 'abc',
      memberCount: 0,
    });
  });

  it('rejects a negative member count', () => {
    expect(roomUpdatedEventSchema.safeParse({ id: 'abc', memberCount: -1 }).success).toBe(false);
  });
});

describe('socket event maps', () => {
  it('types message:send with its payload and ack', () => {
    expectTypeOf<Parameters<ClientToServerEvents['message:send']>>().toEqualTypeOf<
      [SendMessageRequest, (res: SendMessageAck) => void]
    >();
  });

  it('types message:new with a MessageDto', () => {
    expectTypeOf<Parameters<ServerToClientEvents['message:new']>>().toEqualTypeOf<[MessageDto]>();
  });
});
