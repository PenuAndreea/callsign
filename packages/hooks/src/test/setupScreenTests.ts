import { cleanup, configure } from '@testing-library/react';
import { afterEach } from 'vitest';

import { setupApiTestServer } from './server';

/**
 * How long `findBy…` / `waitFor` wait in tests that render whole screens. Testing Library's
 * default (1 s) is too tight for the first render of a test file on CI, where Turbo runs every
 * package's tests at once: the cold start of the app (router, screens, react-native-web) took
 * 2.3 s there, against 70 ms locally. Must stay below Vitest's `testTimeout`.
 */
export const SCREEN_ASYNC_TIMEOUT_MS = 5000;

/** For the test setup file of a package that renders screens (web, screens): MSW, cleanup, waits. */
export function setupScreenTests(): void {
  setupApiTestServer();
  configure({ asyncUtilTimeout: SCREEN_ASYNC_TIMEOUT_MS });
  afterEach(() => {
    cleanup();
  });
}
