import type { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import request from 'supertest';
import type { App } from 'supertest/types';

import { CREDENTIALS, refreshCookie, register, setCookies } from './auth-helpers';
import { Session } from '../src/sessions/session.schema';
import { clearDatabase, createTestApp } from './create-test-app';

describe('Auth: sessions (e2e)', () => {
  let app: INestApplication<App>;
  let server: App;

  beforeEach(async () => {
    app = await createTestApp();
    server = app.getHttpServer();
  });

  afterEach(async () => {
    await clearDatabase(app);
    await app.close();
  });

  /** Moves every rotation a minute into the past, beyond the reuse grace window. */
  const ageRotations = () =>
    app
      .get<Model<Session>>(getModelToken(Session.name))
      .updateMany({}, { rotatedAt: new Date(Date.now() - 60_000) })
      .exec();

  describe('mobile (refresh token in the body)', () => {
    const refresh = (refreshToken: string) =>
      request(server).post('/api/auth/refresh').set('X-Client', 'mobile').send({ refreshToken });

    const nextToken = (res: { body: unknown }) =>
      (res.body as { refreshToken: string }).refreshToken;

    it('rotates on every refresh', async () => {
      const { body } = await register(server);
      const second = nextToken(await refresh(body.refreshToken ?? '').expect(200));
      expect(second).not.toBe(body.refreshToken);
      const third = nextToken(await refresh(second).expect(200));
      expect(third).not.toBe(second);
    });

    it('reuse of an old token revokes the session (stolen-token defense)', async () => {
      const { body } = await register(server);
      const current = nextToken(await refresh(body.refreshToken ?? '').expect(200));
      await ageRotations();

      // Someone replays the token the client already rotated away from...
      await refresh(body.refreshToken ?? '').expect(401);
      // ...so the session is gone, for the real client too.
      await refresh(current).expect(401);
    });

    it('a retry with the previous token right after a rotation still refreshes (lost response)', async () => {
      const { body } = await register(server);
      // The client never received this response (a reload mid-refresh)...
      const lost = nextToken(await refresh(body.refreshToken ?? '').expect(200));
      // ...so it retries with the token it still has, inside the grace window.
      const recovered = nextToken(await refresh(body.refreshToken ?? '').expect(200));

      expect(recovered).not.toBe(lost);
      await refresh(recovered).expect(200);
    });

    it('the token of the lost response no longer works, but does not revoke', async () => {
      const { body } = await register(server);
      const lost = nextToken(await refresh(body.refreshToken ?? '').expect(200));
      const recovered = nextToken(await refresh(body.refreshToken ?? '').expect(200));

      await refresh(lost).expect(401);
      await refresh(recovered).expect(200);
    });

    it('the grace window is not extended by retries', async () => {
      const { body } = await register(server);
      await refresh(body.refreshToken ?? '').expect(200);
      await refresh(body.refreshToken ?? '').expect(200);
      await ageRotations();

      // Past the window measured from the real rotation: reuse detection again.
      await refresh(body.refreshToken ?? '').expect(401);
    });

    it('a login on another device keeps the first one logged in', async () => {
      const { body } = await register(server);
      await request(server)
        .post('/api/auth/login')
        .set('X-Client', 'mobile')
        .send(CREDENTIALS)
        .expect(200);
      await refresh(body.refreshToken ?? '').expect(200);
    });

    it('logout ends the session and is idempotent', async () => {
      const { body } = await register(server);
      const logout = () =>
        request(server)
          .post('/api/auth/logout')
          .set('X-Client', 'mobile')
          .send({ refreshToken: body.refreshToken });
      await logout().expect(204);
      await refresh(body.refreshToken ?? '').expect(401);
      await logout().expect(204);
    });
  });

  describe('web (httpOnly cookie)', () => {
    it('sets a strict, httpOnly cookie scoped to /api/auth and keeps the token out of the body', async () => {
      const { body, cookies } = await register(server, 'web');
      expect(body.refreshToken).toBeUndefined();
      const cookie = refreshCookie(cookies) ?? '';
      expect(cookie).toMatch(/HttpOnly/i);
      expect(cookie).toMatch(/SameSite=Strict/i);
      expect(cookie).toMatch(/Path=\/api\/auth/);
      expect(cookie).toMatch(/Expires=/);
      expect(cookie).not.toMatch(/Secure/i); // COOKIE_SECURE=false in test/setup-env.ts
    });

    it('refreshes from the cookie and rotates it', async () => {
      const agent = request.agent(server);
      await agent.post('/api/auth/register').send(CREDENTIALS).expect(201);
      const res = await agent.post('/api/auth/refresh').expect(200);
      expect(res.body).toMatchObject({ user: { callsign: 'wolf-2' } });
      expect(refreshCookie(setCookies(res.headers))).toBeDefined();
      // The agent now holds the rotated cookie, so a second refresh works too.
      await agent.post('/api/auth/refresh').expect(200);
    });

    it('refresh without a cookie is a 401', async () => {
      const res = await request(server).post('/api/auth/refresh').expect(401);
      expect(res.body).toMatchObject({ code: 'UNAUTHORIZED' });
    });

    it('logout clears the cookie and the session', async () => {
      const agent = request.agent(server);
      const { headers } = await agent.post('/api/auth/register').send(CREDENTIALS).expect(201);
      const oldCookie = (refreshCookie(setCookies(headers)) ?? '').split(';')[0] ?? '';

      const res = await agent.post('/api/auth/logout').expect(204);
      expect(refreshCookie(setCookies(res.headers))).toMatch(
        /refreshToken=;.*Expires=Thu, 01 Jan 1970/,
      );
      // Even a client that kept the old cookie cannot use it any more.
      await request(server).post('/api/auth/refresh').set('Cookie', oldCookie).expect(401);
    });
  });

  it('web and mobile stay logged in side by side; logging out one keeps the other', async () => {
    const web = request.agent(server);
    await web.post('/api/auth/register').send(CREDENTIALS).expect(201);
    const mobile = await request(server)
      .post('/api/auth/login')
      .set('X-Client', 'mobile')
      .send(CREDENTIALS)
      .expect(200);
    const mobileToken = (mobile.body as { refreshToken: string }).refreshToken;

    await web.post('/api/auth/refresh').expect(200);
    await web.post('/api/auth/logout').expect(204);

    await request(server)
      .post('/api/auth/refresh')
      .set('X-Client', 'mobile')
      .send({ refreshToken: mobileToken })
      .expect(200);
  });

  it('rate limits auth routes to 10 requests a minute', async () => {
    const login = () => request(server).post('/api/auth/login').send(CREDENTIALS);
    for (let i = 0; i < 10; i++) {
      await login().expect(401);
    }
    const res = await login().expect(429);
    expect(res.body).toMatchObject({ code: 'RATE_LIMITED' });
  });
});
