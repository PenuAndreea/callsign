import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';

import { createTestApp } from './create-test-app';

const WEB_ORIGIN = 'http://localhost:5173'; // from test/setup-env.ts

describe('HTTP setup (e2e)', () => {
  let app: INestApplication<App>;

  // A fresh app per test also means a fresh in-memory throttler.
  beforeEach(async () => {
    app = await createTestApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it('sends security headers (Helmet)', async () => {
    const res = await request(app.getHttpServer()).get('/api/health').expect(200);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('allows the web origin with credentials', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/health')
      .set('Origin', WEB_ORIGIN)
      .expect(200);
    expect(res.headers['access-control-allow-origin']).toBe(WEB_ORIGIN);
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  // With a fixed origin, the header always names the web origin; the browser blocks the
  // response because it does not match the calling page's origin.
  it('does not allow other origins', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/health')
      .set('Origin', 'https://evil.example')
      .expect(200);
    expect(res.headers['access-control-allow-origin']).not.toBe('https://evil.example');
    expect(res.headers['access-control-allow-origin']).toBe(WEB_ORIGIN);
  });

  it('answers an unknown route with the ApiError shape', async () => {
    const res = await request(app.getHttpServer()).get('/api/nope').expect(404);
    expect(res.body).toEqual({
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Cannot GET /api/nope',
    });
  });

  it('rate limits after 100 requests a minute', async () => {
    const server = app.getHttpServer();
    for (let i = 0; i < 100; i++) {
      await request(server).get('/api/health').expect(200);
    }
    const res = await request(server).get('/api/health').expect(429);
    expect(res.body).toEqual({
      statusCode: 429,
      code: 'RATE_LIMITED',
      message: 'Too many requests',
    });
  });
});
