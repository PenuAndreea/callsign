import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll } from 'vitest';

/** Origin used by every test client. Node's fetch needs an absolute URL. */
export const API_URL = 'http://api.test';

/** Prefixes a path the way the client does: `api('/rooms')` → `http://api.test/api/rooms`. */
export const api = (path: string) => `${API_URL}/api${path}`;

/** No default handlers: each test declares the API it talks to with `server.use(...)`. */
export const server = setupServer();

/** Local Socket.IO test servers (`startSocketTestServer`) are real servers: let them through. */
const SOCKET_TEST_HOST = '127.0.0.1';

/**
 * For a test setup file. An unhandled request fails the test: every call must be expected,
 * except the WebSocket upgrades to a local Socket.IO test server.
 */
export function setupApiTestServer(): void {
  beforeAll(() =>
    server.listen({
      onUnhandledRequest: (request, print) => {
        if (new URL(request.url).hostname !== SOCKET_TEST_HOST) print.error();
      },
    }),
  );
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());
}
