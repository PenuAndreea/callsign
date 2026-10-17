import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';

import { MessagesGateway } from '../src/messages/messages.gateway';
import { netRoom, userRoom } from '../src/realtime/socket-rooms';
import { clearDatabase, createTestApp } from './create-test-app';
import type { Station } from './messages-helpers';
import { station } from './messages-helpers';
import { createRoom } from './rooms-helpers';
import type { ClientSocket } from './socket-helpers';
import {
  collectMessages,
  collectRoomUpdates,
  listen,
  nextMessage,
  nextRoomUpdate,
  sendMessage,
  settle,
  SocketClients,
} from './socket-helpers';

// REST join/leave moves the user's already-open sockets: no reconnect, no client events.
describe('Sockets: membership sync on REST join and leave (e2e)', () => {
  let app: INestApplication<App>;
  let server: App;
  let clients: SocketClients;
  let wolf: Station;
  let eagle: Station;
  let roomId: string;
  let wolfSocket: ClientSocket;
  let eagleSocket: ClientSocket;

  beforeEach(async () => {
    app = await createTestApp();
    clients = new SocketClients(await listen(app));
    server = app.getHttpServer();
    wolf = await station(server, 'wolf-2');
    eagle = await station(server, 'eagle-1');
    roomId = (await createRoom(server, wolf.token, 'tower')).id;
    // Both connect before eagle joins: eagle's socket is not in the net yet.
    wolfSocket = await clients.connectAs(wolf.token);
    eagleSocket = await clients.connectAs(eagle.token);
  });

  afterEach(async () => {
    clients.closeAll();
    await clearDatabase(app);
    await app.close();
  });

  const join = (token: string, id = roomId) =>
    request(server).put(`/api/rooms/${id}/members/me`).auth(token, { type: 'bearer' }).expect(200);

  const leave = (token: string, id = roomId) =>
    request(server)
      .delete(`/api/rooms/${id}/members/me`)
      .auth(token, { type: 'bearer' })
      .expect(204);

  const say = (content: string) => sendMessage(wolfSocket, { roomId, content });

  /** How many of the user's sockets are in the net right now (server side). */
  const socketsInNet = async (userId: string, id = roomId): Promise<number> => {
    const sockets = await app.get(MessagesGateway).server.in(userRoom(userId)).fetchSockets();
    return sockets.filter((socket) => socket.rooms.has(netRoom(id))).length;
  };

  describe('join', () => {
    it('starts delivering the net to an open socket, without reconnecting', async () => {
      await join(eagle.token);
      const [received] = await Promise.all([
        nextMessage(eagleSocket),
        say('Welcome, eagle. Over.'),
      ]);
      expect(received.content).toBe('Welcome, eagle. Over.');
    });

    it('moves every device of the user', async () => {
      const eagleLaptop = await clients.connectAs(eagle.token);
      await join(eagle.token);
      await expect(socketsInNet(eagle.user.id)).resolves.toBe(2);
      const [onLaptop] = await Promise.all([nextMessage(eagleLaptop), say('Both? Over.')]);
      expect(onLaptop.content).toBe('Both? Over.');
    });

    it('tells every member the new count, the joiner included', async () => {
      const [atWolf, atEagle] = await Promise.all([
        nextRoomUpdate(wolfSocket),
        nextRoomUpdate(eagleSocket),
        join(eagle.token),
      ]);
      expect(atWolf).toEqual({ id: roomId, memberCount: 2 });
      expect(atEagle).toEqual({ id: roomId, memberCount: 2 });
    });

    it('sends no update on a repeated join, but puts a stray socket back in the net', async () => {
      await join(eagle.token);
      // Simulates a socket that missed the sync.
      app.get(MessagesGateway).server.in(userRoom(eagle.user.id)).socketsLeave(netRoom(roomId));
      await expect(socketsInNet(eagle.user.id)).resolves.toBe(0);

      const updates = collectRoomUpdates(wolfSocket);
      await join(eagle.token);
      await settle();
      expect(updates).toEqual([]);
      await expect(socketsInNet(eagle.user.id)).resolves.toBe(1);
    });

    it('puts the creator of a new net in it right away', async () => {
      const ground = await createRoom(server, eagle.token, 'ground');
      await expect(socketsInNet(eagle.user.id, ground.id)).resolves.toBe(1);
    });
  });

  describe('leave', () => {
    beforeEach(async () => {
      await join(eagle.token);
    });

    it('stops delivering the net to every device of the user', async () => {
      const eagleLaptop = await clients.connectAs(eagle.token);
      const inboxes = [collectMessages(eagleSocket), collectMessages(eagleLaptop)];
      await leave(eagle.token);
      await say('Anyone left? Over.');
      await settle();
      expect(inboxes).toEqual([[], []]);
      await expect(socketsInNet(eagle.user.id)).resolves.toBe(0);
    });

    it('tells the remaining members the new count, not the leaver', async () => {
      const leaverUpdates = collectRoomUpdates(eagleSocket);
      const [atWolf] = await Promise.all([nextRoomUpdate(wolfSocket), leave(eagle.token)]);
      expect(atWolf).toEqual({ id: roomId, memberCount: 1 });
      await settle();
      expect(leaverUpdates).toEqual([]);
    });

    it('sends no update on a repeated leave, but takes a stray socket out of the net', async () => {
      await leave(eagle.token);
      app.get(MessagesGateway).server.in(userRoom(eagle.user.id)).socketsJoin(netRoom(roomId));

      const updates = collectRoomUpdates(wolfSocket);
      await leave(eagle.token);
      await settle();
      expect(updates).toEqual([]);
      await expect(socketsInNet(eagle.user.id)).resolves.toBe(0);
    });

    it('can rejoin and receive again', async () => {
      await leave(eagle.token);
      await join(eagle.token);
      const [received] = await Promise.all([nextMessage(eagleSocket), say('Welcome back. Over.')]);
      expect(received.content).toBe('Welcome back. Over.');
    });
  });
});
