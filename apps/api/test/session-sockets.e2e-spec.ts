import type { INestApplication } from '@nestjs/common';
import type { AuthResponse } from '@callsign/types';
import { getModelToken } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import request from 'supertest';
import type { App } from 'supertest/types';

import { Session } from '../src/sessions/session.schema';
import { CREDENTIALS, register } from './auth-helpers';
import { clearDatabase, createTestApp } from './create-test-app';
import type { ClientSocket } from './socket-helpers';
import { listen, settle, SocketClients } from './socket-helpers';

/** Resolves with the reason once the socket is disconnected. */
function disconnected(socket: ClientSocket): Promise<string> {
  return new Promise((resolve) => socket.once('disconnect', resolve));
}

// The handshake checks the access token once; ending a session must close that device's sockets.
describe('Sockets: ending a session (e2e)', () => {
  let app: INestApplication<App>;
  let server: App;
  let clients: SocketClients;
  /** Two devices of the same station: each has its own session. */
  let phone: AuthResponse;
  let tablet: AuthResponse;

  const login = async (): Promise<AuthResponse> =>
    (
      await request(server)
        .post('/api/auth/login')
        .set('X-Client', 'mobile')
        .send(CREDENTIALS)
        .expect(200)
    ).body as AuthResponse;

  const refresh = (refreshToken: string | undefined) =>
    request(server).post('/api/auth/refresh').set('X-Client', 'mobile').send({ refreshToken });

  beforeEach(async () => {
    app = await createTestApp();
    clients = new SocketClients(await listen(app));
    server = app.getHttpServer();
    phone = (await register(server, 'mobile')).body;
    tablet = await login();
  });

  afterEach(async () => {
    clients.closeAll();
    await clearDatabase(app);
    await app.close();
  });

  it('logout closes the sockets of that device only', async () => {
    const phoneSocket = await clients.connectAs(phone.accessToken);
    const tabletSocket = await clients.connectAs(tablet.accessToken);
    const phoneClosed = disconnected(phoneSocket);

    await request(server)
      .post('/api/auth/logout')
      .set('X-Client', 'mobile')
      .send({ refreshToken: phone.refreshToken })
      .expect(204);

    await expect(phoneClosed).resolves.toBe('io server disconnect');
    await settle();
    expect(tabletSocket.connected).toBe(true);
  });

  it('refresh token reuse closes the revoked session’s sockets, a thief’s included', async () => {
    // The real phone refreshes; a thief kept the old refresh token and the access token.
    const rotated = (await refresh(phone.refreshToken).expect(200)).body as AuthResponse;
    const phoneSocket = await clients.connectAs(rotated.accessToken);
    const thiefSocket = await clients.connectAs(phone.accessToken);
    const tabletSocket = await clients.connectAs(tablet.accessToken);
    const phoneClosed = disconnected(phoneSocket);
    const thiefClosed = disconnected(thiefSocket);

    // After the grace window, the old token comes back: reuse, the session is revoked.
    const sessions = app.get<Model<Session>>(getModelToken(Session.name));
    await sessions.updateMany({}, { rotatedAt: new Date(Date.now() - 60_000) });
    await refresh(phone.refreshToken).expect(401);

    await expect(phoneClosed).resolves.toBe('io server disconnect');
    await expect(thiefClosed).resolves.toBe('io server disconnect');
    await settle();
    expect(tabletSocket.connected).toBe(true);
  });

  it('a logout with an unknown token closes nothing', async () => {
    const phoneSocket = await clients.connectAs(phone.accessToken);

    await request(server)
      .post('/api/auth/logout')
      .set('X-Client', 'mobile')
      .send({ refreshToken: 'not-a-real-token' })
      .expect(204);

    await settle();
    expect(phoneSocket.connected).toBe(true);
  });
});
