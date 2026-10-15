import { randomUUID } from 'node:crypto';

import { MONGO_MEMORY_URI } from './mongo-memory';

// Fixed env for e2e tests, so they never depend on a local `.env` (CI has none).
// Values set here win: ConfigModule's `.env` loading never overrides `process.env`.
// Runs before each test file's imports, so `ConfigModule.forRoot` already sees these values.
const serverUri = process.env[MONGO_MEMORY_URI];
if (!serverUri) {
  throw new Error(`${MONGO_MEMORY_URI} is not set: is test/global-setup.ts configured?`);
}

Object.assign(process.env, {
  NODE_ENV: 'test',
  // A fresh database per test file on the shared memory server, so files never see each other's data.
  MONGODB_URI: `${serverUri}callsign-${randomUUID()}`,
  WEB_ORIGIN: 'http://localhost:5173',
  JWT_ACCESS_SECRET: 'test-secret-that-is-at-least-32-characters',
  COOKIE_SECURE: 'false',
});
