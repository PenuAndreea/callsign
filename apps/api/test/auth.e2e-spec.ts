import type { INestApplication } from '@nestjs/common';
import { userDtoSchema } from '@callsign/types';
import request from 'supertest';
import type { App } from 'supertest/types';

import { CREDENTIALS, refreshCookie, register } from './auth-helpers';
import { clearDatabase, createTestApp } from './create-test-app';

// Register, login, me. Sessions (refresh, logout, cookies, rate limit) are in auth-session.e2e-spec.ts.
describe('Auth: register, login, me (e2e)', () => {
  let app: INestApplication<App>;
  let server: App;

  // A fresh app per test: a fresh throttler too, so the 10/min auth limit never interferes.
  beforeEach(async () => {
    app = await createTestApp();
    server = app.getHttpServer();
  });

  afterEach(async () => {
    await clearDatabase(app);
    await app.close();
  });

  describe('POST /api/auth/register', () => {
    it('creates the user and logs in (mobile: refresh token in the body)', async () => {
      const { body, cookies } = await register(server, 'mobile');
      expect(userDtoSchema.parse(body.user).callsign).toBe('wolf-2');
      expect(body.accessToken).toEqual(expect.any(String));
      expect(body.refreshToken).toEqual(expect.any(String));
      expect(refreshCookie(cookies)).toBeUndefined();
    });

    it('never returns secrets', async () => {
      const res = await request(server).post('/api/auth/register').send(CREDENTIALS).expect(201);
      expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|argon2|tokenHash/);
    });

    it('rejects a taken callsign, case-insensitively', async () => {
      await register(server);
      const res = await request(server)
        .post('/api/auth/register')
        .send({ ...CREDENTIALS, callsign: ' WOLF-2 ' })
        .expect(409);
      expect(res.body).toMatchObject({ code: 'CALLSIGN_TAKEN' });
    });

    it('rejects an invalid body with VALIDATION_FAILED', async () => {
      const res = await request(server)
        .post('/api/auth/register')
        .send({ callsign: 'ab', passphrase: 'short' })
        .expect(400);
      expect(res.body).toMatchObject({ code: 'VALIDATION_FAILED' });
      expect((res.body as { message: string }).message).toMatch(/callsign.*passphrase/);
    });

    it('rejects malformed JSON with a 400', async () => {
      const res = await request(server)
        .post('/api/auth/register')
        .set('Content-Type', 'application/json')
        .send('{"callsign":')
        .expect(400);
      expect(res.body).toMatchObject({ statusCode: 400, code: 'VALIDATION_FAILED' });
    });

    it('rejects an unknown X-Client', async () => {
      await request(server)
        .post('/api/auth/register')
        .set('X-Client', 'desktop')
        .send(CREDENTIALS)
        .expect(400);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await register(server);
    });

    it('logs in with any casing of the callsign', async () => {
      const res = await request(server)
        .post('/api/auth/login')
        .set('X-Client', 'mobile')
        .send({ ...CREDENTIALS, callsign: 'WOLF-2' })
        .expect(200);
      expect(res.body).toMatchObject({ user: { callsign: 'wolf-2' } });
    });

    it('gives the same 401 for a wrong passphrase and an unknown callsign', async () => {
      const wrong = await request(server)
        .post('/api/auth/login')
        .send({ ...CREDENTIALS, passphrase: 'wrong horse' })
        .expect(401);
      const unknown = await request(server)
        .post('/api/auth/login')
        .send({ ...CREDENTIALS, callsign: 'nobody' })
        .expect(401);
      expect(wrong.body).toEqual(unknown.body);
      expect(wrong.body).toMatchObject({ code: 'INVALID_CREDENTIALS' });
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns the user for a valid access token', async () => {
      const { body } = await register(server);
      const res = await request(server)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${body.accessToken}`)
        .expect(200);
      expect(res.body).toEqual(body.user);
    });

    it('rejects a missing or invalid token (the global guard)', async () => {
      await request(server).get('/api/auth/me').expect(401);
      const res = await request(server)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer not-a-jwt')
        .expect(401);
      expect(res.body).toMatchObject({ code: 'UNAUTHORIZED' });
    });
  });
});
