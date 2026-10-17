import type { INestApplication } from '@nestjs/common';
import type { MessageDto, Page, RoomDto } from '@callsign/types';
import { messageDtoSchema } from '@callsign/types';
import { Types } from 'mongoose';
import request from 'supertest';
import type { App } from 'supertest/types';

import { SEND_LIMIT } from '../src/messages/messages.gateway';
import { MESSAGE_PREVIEW_LENGTH } from '../src/rooms/message-preview';
import { RoomsService } from '../src/rooms/rooms.service';
import { clearDatabase, createTestApp } from './create-test-app';
import type { Station } from './messages-helpers';
import { station } from './messages-helpers';
import { createRoom } from './rooms-helpers';
import type { ClientSocket } from './socket-helpers';
import {
  collectMessages,
  emitWithoutAck,
  listen,
  nextMessage,
  sendMessage,
  settle,
  SocketClients,
} from './socket-helpers';

describe('Messages: message:send over the socket (e2e)', () => {
  let app: INestApplication<App>;
  let server: App;
  let clients: SocketClients;
  let wolf: Station;
  let eagle: Station;
  let roomId: string;
  let wolfSocket: ClientSocket;

  beforeEach(async () => {
    app = await createTestApp();
    clients = new SocketClients(await listen(app));
    server = app.getHttpServer();
    wolf = await station(server, 'wolf-2');
    eagle = await station(server, 'eagle-1');
    roomId = (await createRoom(server, wolf.token, 'tower')).id;
    wolfSocket = await clients.connectAs(wolf.token);
  });

  afterEach(async () => {
    clients.closeAll();
    await clearDatabase(app);
    await app.close();
  });

  const joinTower = (token: string) =>
    request(server)
      .put(`/api/rooms/${roomId}/members/me`)
      .auth(token, { type: 'bearer' })
      .expect(200);

  const getRoom = async (id = roomId): Promise<RoomDto> =>
    (await request(server).get(`/api/rooms/${id}`).auth(wolf.token, { type: 'bearer' }))
      .body as RoomDto;

  const history = async (): Promise<MessageDto[]> =>
    (
      (
        await request(server)
          .get(`/api/rooms/${roomId}/messages`)
          .auth(wolf.token, { type: 'bearer' })
          .expect(200)
      ).body as Page<MessageDto>
    ).items;

  const expectRefused = async (payload: unknown, code: string, socket = wolfSocket) => {
    const ack = await sendMessage(socket, payload);
    expect(ack).toMatchObject({ ok: false, error: { code } });
  };

  describe('success', () => {
    it('saves the message and acks it, with the sender from the token', async () => {
      const ack = await sendMessage(wolfSocket, { roomId, content: '  Radio check. Over.  ' });
      if (!ack.ok) throw new Error(`refused: ${ack.error.code}`);

      expect(messageDtoSchema.parse(ack.message)).toMatchObject({
        roomId,
        content: 'Radio check. Over.',
        sender: { id: wolf.user.id, callsign: 'wolf-2' },
      });
      await expect(history()).resolves.toEqual([ack.message]);
    });

    it('ignores a sender sent by the client', async () => {
      const ack = await sendMessage(wolfSocket, {
        roomId,
        content: 'Over.',
        senderId: eagle.user.id,
        sender: { id: eagle.user.id, callsign: 'eagle-1' },
      });
      expect(ack).toMatchObject({ ok: true, message: { sender: { id: wolf.user.id } } });
    });

    it('broadcasts to every member, the sender included, and not to others', async () => {
      await joinTower(eagle.token);
      const eagleSocket = await clients.connectAs(eagle.token);
      const outsider = await station(server, 'hawk-3');
      const outsiderSocket = await clients.connectAs(outsider.token);
      const outsiderInbox = collectMessages(outsiderSocket);

      const [ack, atEagle, atWolf] = await Promise.all([
        sendMessage(wolfSocket, { roomId, content: 'Radio check. Over.' }),
        nextMessage(eagleSocket),
        nextMessage(wolfSocket),
      ]);

      expect(ack.ok && ack.message).toEqual(atEagle);
      expect(atWolf).toEqual(atEagle);
      await settle();
      expect(outsiderInbox).toEqual([]);
    });

    it('reaches every device of a member', async () => {
      const wolfLaptop = await clients.connectAs(wolf.token);
      const [ack, onLaptop] = await Promise.all([
        sendMessage(wolfSocket, { roomId, content: 'Over.' }),
        nextMessage(wolfLaptop),
      ]);
      expect(ack.ok && ack.message.id).toBe(onLaptop.id);
    });

    it('acks the sender before the broadcast arrives', async () => {
      // Raw callbacks run synchronously as each packet is handled, so `events` is the wire order.
      // (A `.then` on `emitWithAck` would run a microtask later and could land after
      // `message:new` when both packets arrive together.)
      const events: string[] = [];
      const broadcast = new Promise<void>((resolve) =>
        wolfSocket.once('message:new', () => {
          events.push('message:new');
          resolve();
        }),
      );
      wolfSocket.emit('message:send', { roomId, content: 'Over.' }, () => events.push('ack'));
      await broadcast;
      expect(events).toEqual(['ack', 'message:new']);
    });

    it('works without an ack callback', async () => {
      const received = nextMessage(wolfSocket);
      emitWithoutAck(wolfSocket, 'message:send', { roomId, content: 'No ack needed. Over.' });
      await expect(received).resolves.toMatchObject({ content: 'No ack needed. Over.' });
    });
  });

  describe('last message preview', () => {
    it('updates the net preview', async () => {
      await sendMessage(wolfSocket, { roomId, content: 'Radio check. Over.' });
      const room = await getRoom();
      expect(room.lastMessage).toMatchObject({ content: 'Radio check. Over.' });
    });

    it('cuts a long message to the preview length', async () => {
      await sendMessage(wolfSocket, { roomId, content: 'x'.repeat(500) });
      const room = await getRoom();
      expect(room.lastMessage?.content).toHaveLength(MESSAGE_PREVIEW_LENGTH);
      expect(room.lastMessage?.content.endsWith('…')).toBe(true);
    });

    it('never replaces a newer preview with an older message', async () => {
      const first = await sendMessage(wolfSocket, { roomId, content: 'First. Over.' });
      await sendMessage(wolfSocket, { roomId, content: 'Second. Over.' });
      if (!first.ok) throw new Error('first send refused');

      // Replays the first message's preview write, as if it had finished last.
      const changed = await app.get(RoomsService).recordLastMessage({
        messageId: new Types.ObjectId(first.message.id),
        roomId: new Types.ObjectId(roomId),
        senderId: new Types.ObjectId(wolf.user.id),
        content: first.message.content,
        createdAt: new Date(first.message.createdAt),
      });

      expect(changed).toBe(false);
      await expect(getRoom()).resolves.toMatchObject({
        lastMessage: { content: 'Second. Over.' },
      });
    });
  });

  describe('refusals', () => {
    it('refuses a station that is not a member, and saves nothing', async () => {
      const eagleSocket = await clients.connectAs(eagle.token);
      await expectRefused({ roomId, content: 'Let me in. Over.' }, 'NOT_A_MEMBER', eagleSocket);
      await expect(history()).resolves.toEqual([]);
    });

    it('refuses a net that does not exist', async () => {
      const unknown = new Types.ObjectId().toHexString();
      await expectRefused({ roomId: unknown, content: 'Anyone? Over.' }, 'NOT_A_MEMBER');
    });

    it('refuses after the station left the net', async () => {
      await request(server)
        .delete(`/api/rooms/${roomId}/members/me`)
        .auth(wolf.token, { type: 'bearer' })
        .expect(204);
      await expectRefused({ roomId, content: 'Still here? Over.' }, 'NOT_A_MEMBER');
    });

    it.each([
      ['a malformed net id', { roomId: 'tower', content: 'Over.' }],
      ['empty content', { content: '' }],
      ['whitespace-only content', { content: '   ' }],
      ['content over 1000 characters', { content: 'x'.repeat(1001) }],
      ['a missing content', { content: undefined }],
    ])('refuses %s with VALIDATION_FAILED', async (_case, overrides) => {
      await expectRefused({ roomId, ...overrides }, 'VALIDATION_FAILED');
      await expect(history()).resolves.toEqual([]);
    });

    it.each([
      ['a string', 'hello'],
      ['null', null],
      ['an array', [roomId, 'hello']],
    ])('refuses a payload that is %s', async (_case, payload) => {
      await expectRefused(payload, 'VALIDATION_FAILED');
    });
  });

  describe('rate limit', () => {
    it(`allows ${SEND_LIMIT.limit} messages per window, then refuses with RATE_LIMITED`, async () => {
      const acks = [];
      for (let i = 0; i <= SEND_LIMIT.limit; i++) {
        acks.push(await sendMessage(wolfSocket, { roomId, content: `Message ${i}. Over.` }));
      }
      expect(acks.slice(0, SEND_LIMIT.limit).every((ack) => ack.ok)).toBe(true);
      expect(acks.at(-1)).toMatchObject({ ok: false, error: { code: 'RATE_LIMITED' } });
      await expect(history()).resolves.toHaveLength(SEND_LIMIT.limit);
    });

    it('counts per socket', async () => {
      for (let i = 0; i < SEND_LIMIT.limit; i++) {
        await sendMessage(wolfSocket, { roomId, content: `Message ${i}. Over.` });
      }
      const otherDevice = await clients.connectAs(wolf.token);
      await expect(sendMessage(otherDevice, { roomId, content: 'Over.' })).resolves.toMatchObject({
        ok: true,
      });
    });
  });
});
