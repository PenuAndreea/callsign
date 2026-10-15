// Fixed env for e2e tests, so they never depend on a local `.env` (CI has none).
// Values set here win: ConfigModule's `.env` loading never overrides `process.env`.
Object.assign(process.env, {
  NODE_ENV: 'test',
  MONGODB_URI: 'mongodb://127.0.0.1:27017/callsign-test',
  WEB_ORIGIN: 'http://localhost:5173',
  JWT_ACCESS_SECRET: 'test-secret-that-is-at-least-32-characters',
  COOKIE_SECURE: 'false',
});
