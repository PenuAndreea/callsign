import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import type { App } from 'supertest/types';

import { MessagesGateway } from '../src/messages/messages.gateway';
import { netRoom, userRoom } from '../src/realtime/socket-rooms';
import { clearDatabase, createTestApp } from './create-test-app';
import type { Station } from './messages-helpers';
import { station } from './messages-helpers';
import { createRoom } from './rooms-helpers';
import type { HandshakeError } from './socket-helpers';
import { listen, SocketClients } from './socket-helpers';

describe('Sockets: handshake and rooms (e2e)', () => {
  let app: INestApplication<App>;
  let server: App;
  let clients: SocketClients;
  let wolf: Station;

  beforeEach(async () => {
    app = await createTestApp();
    clients = new SocketClients(await listen(app));
    server = app.getHttpServer();
    wolf = await station(server, 'wolf-2');
  });

  afterEach(async () => {
    clients.closeAll();
    await clearDatabase(app);
    await app.close();
  });

  /** The server-side rooms of every socket in `room`. */
  const roomsOfSocketsIn = async (room: string): Promise<string[][]> => {
    const sockets = await app.get(MessagesGateway).server.in(room).fetchSockets();
    return sockets.map((socket) => [...socket.rooms]);
  };

  describe('handshake', () => {
    it.each([
      ['no token', {}],
      ['an empty token', { token: '' }],
      ['a token that is not a string', { token: 42 }],
      ['a token that is not a JWT', { token: 'not-a-jwt' }],
    ])('refuses %s with UNAUTHORIZED', async (_case, auth) => {
      const error = await clients.connect(auth).then(
        () => undefined,
        (refusal: HandshakeError) => refusal,
      );
      expect(error?.message).toBe('UNAUTHORIZED');
      expect(error?.data).toMatchObject({ statusCode: 401, code: 'UNAUTHORIZED' });
    });

    it('refuses a well-formed token signed with another secret', async () => {
      const forged = await new JwtService({
        secret: 'another-secret-that-is-at-least-32-characters',
      }).signAsync({ sub: wolf.user.id, callsign: 'wolf-2' });
      await expect(clients.connect({ token: forged })).rejects.toMatchObject({
        message: 'UNAUTHORIZED',
      });
    });

    it('accepts a valid access token', async () => {
      const socket = await clients.connect({ token: wolf.token });
      expect(socket.connected).toBe(true);
    });
  });

  describe('rooms on connect', () => {
    it('puts the socket in its user room and in every joined net, before connect', async () => {
      const tower = await createRoom(server, wolf.token, 'tower');
      const ground = await createRoom(server, wolf.token, 'ground');
      const eagle = await station(server, 'eagle-1');
      const open = await createRoom(server, eagle.token, 'approach');

      const socket = await clients.connect({ token: wolf.token });
      // Checked right after `connect`, without waiting: the joins happen in the handshake.
      const [rooms] = await roomsOfSocketsIn(userRoom(wolf.user.id));
      expect(rooms).toEqual(
        expect.arrayContaining([
          socket.id,
          userRoom(wolf.user.id),
          netRoom(tower.id),
          netRoom(ground.id),
        ]),
      );
      expect(rooms).toHaveLength(4);
      expect(rooms).not.toContain(netRoom(open.id));
    });

    it('puts every device of a user in the same user room', async () => {
      await clients.connect({ token: wolf.token });
      await clients.connect({ token: wolf.token });
      await expect(roomsOfSocketsIn(userRoom(wolf.user.id))).resolves.toHaveLength(2);
    });

    it('keeps users apart', async () => {
      const eagle = await station(server, 'eagle-1');
      await clients.connect({ token: wolf.token });
      await clients.connect({ token: eagle.token });
      await expect(roomsOfSocketsIn(userRoom(wolf.user.id))).resolves.toHaveLength(1);
      await expect(roomsOfSocketsIn(userRoom(eagle.user.id))).resolves.toHaveLength(1);
    });
  });

  describe('CORS (polling handshake)', () => {
    const handshake = (origin: string) =>
      request(server).get('/socket.io/?EIO=4&transport=polling').set('Origin', origin);

    it('allows the web origin with credentials', async () => {
      const res = await handshake('http://localhost:5173').expect(200);
      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
      expect(res.headers['access-control-allow-credentials']).toBe('true');
    });

    it('does not allow another origin', async () => {
      const res = await handshake('https://evil.example');
      expect(res.headers['access-control-allow-origin']).not.toBe('https://evil.example');
    });

    it('does not serve the client bundle', async () => {
      await request(server).get('/socket.io/socket.io.js').expect(400);
    });
  });
});
