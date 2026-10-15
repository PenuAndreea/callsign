import type { INestApplication } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import type { Connection } from 'mongoose';
import type { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';

/**
 * The full app, set up exactly like `main.ts`. Close it in `afterEach` / `afterAll`.
 * Waits for every index: Mongoose builds them in the background, and a uniqueness test
 * could otherwise run before the unique index exists.
 */
export async function createTestApp(): Promise<INestApplication<App>> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication<INestApplication<App>>();
  configureApp(app);
  await app.init();
  const connection = app.get<Connection>(getConnectionToken());
  await Promise.all(Object.values(connection.models).map((model) => model.init()));
  return app;
}

/** Empties every collection (keeps the indexes, unlike dropping the database). */
export async function clearDatabase(app: INestApplication): Promise<void> {
  const connection = app.get<Connection>(getConnectionToken());
  await Promise.all(Object.values(connection.models).map((model) => model.deleteMany({})));
}
