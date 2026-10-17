import { setupServer } from 'msw/node';

/** Origin used by every test client. Node's fetch needs an absolute URL. */
export const API_URL = 'http://api.test';

/** Prefixes a path the way the client does: `api('/rooms')` → `http://api.test/api/rooms`. */
export const api = (path: string) => `${API_URL}/api${path}`;

/** No default handlers: each test declares the API it talks to with `server.use(...)`. */
export const server = setupServer();
