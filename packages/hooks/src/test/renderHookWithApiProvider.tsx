import { QueryClient } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';

import type { ApiClient } from '../api/createApiClient';
import { createApiClient } from '../api/createApiClient';
import type { ApiPlatform } from '../platform/platform.types';
import { ApiProvider } from '../provider/ApiProvider';
import { webPlatform } from './fixtures';

export interface TestClients {
  apiClient: ApiClient;
  /** No query retries: a failing request fails the test at once. */
  queryClient: QueryClient;
}

/** Fresh clients per test, so no token or cached data leaks from the previous one. */
export function createTestClients(platform: ApiPlatform = webPlatform): TestClients {
  return {
    apiClient: createApiClient(platform),
    queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  };
}

/**
 * Renders a hook inside a fresh `ApiProvider` (needs jsdom). Returns the clients too, so a
 * test can seed the cache or check the token. The provider restores the session on mount:
 * declare `/auth/refresh` before calling this.
 */
export function renderHookWithApiProvider<T>(hook: () => T, platform: ApiPlatform = webPlatform) {
  const clients = createTestClients(platform);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ApiProvider platform={platform} {...clients}>
      {children}
    </ApiProvider>
  );
  return { ...renderHook(hook, { wrapper }), ...clients };
}
