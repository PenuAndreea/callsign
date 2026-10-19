import { randomUUID } from 'node:crypto';

import type { INestApplication } from '@nestjs/common';
import type { MessageDto, Page, RoomDto, SendMessageAck } from '@callsign/types';
import request from 'supertest';
import type { App } from 'supertest/types';

import { clearDatabase, createTestApp } from './create-test-app';
import type { Station } from './messages-helpers';
import { station } from './messages-helpers';
import { createRoom } from './rooms-helpers';
import type { ClientSocket } from './socket-helpers';
import { collectMessages, listen, sendMessage, settle, SocketClients } from './socket-helpers';

function savedMessage(ack: SendMessageAck): MessageDto {
  if (!ack.ok) throw new Error(`refused: ${ack.error.code}`);
  return ack.message;
}

describe('Messages: idempotent message:send with clientMessageId (e2e)', () => {
  let app: INestApplication<App>;
  let server: App;
  let clients: SocketClients;
  let wolf: Station;
  let roomId: string;
  let wolfSocket: ClientSocket;

  beforeEach(async () => {
    app = await createTestApp();
    clients = new SocketClients(await listen(app));
    server = app.getHttpServer();
    wolf = await station(server, 'wolf-2');
    roomId = (await createRoom(server, wolf.token, 'tower')).id;
    wolfSocket = await clients.connectAs(wolf.token);
  });

  afterEach(async () => {
    clients.closeAll();
    await clearDatabase(app);
    await app.close();
  });

  const history = async (id = roomId): Promise<MessageDto[]> =>
    (
      (
        await request(server)
          .get(`/api/rooms/${id}/messages`)
          .auth(wolf.token, { type: 'bearer' })
          .expect(200)
      ).body as Page<MessageDto>
    ).items;

  it('echoes the key in the ack and in the broadcast', async () => {
    const clientMessageId = randomUUID();
    const inbox = collectMessages(wolfSocket);
    const message = savedMessage(
      await sendMessage(wolfSocket, { roomId, content: 'Over.', clientMessageId }),
    );

    expect(message.clientMessageId).toBe(clientMessageId);
    await settle();
    expect(inbox).toEqual([message]);
  });

  it('acks a retry with the saved message, saves it once and broadcasts it once', async () => {
    const payload = { roomId, content: 'Radio check. Over.', clientMessageId: randomUUID() };
    const inbox = collectMessages(wolfSocket);

    const first = savedMessage(await sendMessage(wolfSocket, payload));
    const retry = savedMessage(await sendMessage(wolfSocket, payload));

    expect(retry).toEqual(first);
    await expect(history()).resolves.toEqual([first]);
    await settle();
    expect(inbox).toEqual([first]);
  });

  it('dedupes a retry from another device of the same station', async () => {
    const payload = { roomId, content: 'Over.', clientMessageId: randomUUID() };
    const laptop = await clients.connectAs(wolf.token);

    const first = savedMessage(await sendMessage(wolfSocket, payload));
    await expect(sendMessage(laptop, payload)).resolves.toEqual({ ok: true, message: first });
  });

  it('saves one copy when retries race', async () => {
    const payload = { roomId, content: 'Over.', clientMessageId: randomUUID() };
    const acks = await Promise.all([
      sendMessage(wolfSocket, payload),
      sendMessage(wolfSocket, payload),
      sendMessage(wolfSocket, payload),
    ]);

    const ids = new Set(acks.map((ack) => savedMessage(ack).id));
    expect(ids.size).toBe(1);
    await expect(history()).resolves.toHaveLength(1);
  });

  it('keeps the saved content when a retry sends different content', async () => {
    const clientMessageId = randomUUID();
    await sendMessage(wolfSocket, { roomId, content: 'First. Over.', clientMessageId });
    const retry = savedMessage(
      await sendMessage(wolfSocket, { roomId, content: 'Edited. Over.', clientMessageId }),
    );
    expect(retry.content).toBe('First. Over.');
  });

  it('treats the same key as a new message for another station or another net', async () => {
    const clientMessageId = randomUUID();
    const eagle = await station(server, 'eagle-1');
    await request(server)
      .put(`/api/rooms/${roomId}/members/me`)
      .auth(eagle.token, { type: 'bearer' })
      .expect(200);
    const eagleSocket = await clients.connectAs(eagle.token);
    const ground: RoomDto = await createRoom(server, wolf.token, 'ground');

    const mine = savedMessage(
      await sendMessage(wolfSocket, { roomId, content: 'Over.', clientMessageId }),
    );
    const eagles = savedMessage(
      await sendMessage(eagleSocket, { roomId, content: 'Over.', clientMessageId }),
    );
    const otherNet = savedMessage(
      await sendMessage(wolfSocket, { roomId: ground.id, content: 'Over.', clientMessageId }),
    );

    expect(new Set([mine.id, eagles.id, otherNet.id]).size).toBe(3);
  });

  it('saves every send without a key, even with the same content', async () => {
    await sendMessage(wolfSocket, { roomId, content: 'Over.' });
    await sendMessage(wolfSocket, { roomId, content: 'Over.' });
    await expect(history()).resolves.toHaveLength(2);
  });

  it('refuses a key that is not a UUID', async () => {
    const ack = await sendMessage(wolfSocket, { roomId, content: 'Over.', clientMessageId: 'x' });
    expect(ack).toMatchObject({ ok: false, error: { code: 'VALIDATION_FAILED' } });
  });
});
