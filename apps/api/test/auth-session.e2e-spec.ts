import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';

import { CREDENTIALS, refreshCookie, register, setCookies } from './auth-helpers';
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

  describe('mobile (refresh token in the body)', () => {
    const refresh = (refreshToken: string) =>
      request(server).post('/api/auth/refresh').set('X-Client', 'mobile').send({ refreshToken });

    it('rotates: the new token works, the old one is refused', async () => {
      const { body } = await register(server);
      const first = await refresh(body.refreshToken ?? '').expect(200);
      const next = (first.body as { refreshToken: string }).refreshToken;
      expect(next).not.toBe(body.refreshToken);
      await refresh(body.refreshToken ?? '').expect(401);
      await refresh(next).expect(200);
    });

    it('a new login ends the previous session (one session per user)', async () => {
      const { body } = await register(server);
      await request(server).post('/api/auth/login').set('X-Client', 'mobile').send(CREDENTIALS);
      await refresh(body.refreshToken ?? '').expect(401);
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

  it('rate limits auth routes to 10 requests a minute', async () => {
    const login = () => request(server).post('/api/auth/login').send(CREDENTIALS);
    for (let i = 0; i < 10; i++) {
      await login().expect(401);
    }
    const res = await login().expect(429);
    expect(res.body).toMatchObject({ code: 'RATE_LIMITED' });
  });
});
