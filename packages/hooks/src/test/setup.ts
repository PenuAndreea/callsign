import { afterAll, afterEach, beforeAll } from 'vitest';

import { server } from './server';

// An unhandled request fails the test: every call a hook makes must be expected.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
