import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';

import { createTestApp } from './create-test-app';

describe('Health (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    app = await createTestApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /api/health', () => {
    return request(app.getHttpServer()).get('/api/health').expect(200).expect({ status: 'ok' });
  });
});
