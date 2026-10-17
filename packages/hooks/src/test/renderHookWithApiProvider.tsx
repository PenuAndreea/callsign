import { QueryClient } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';

import type { ApiClient } from '../api/createApiClient';
import { createApiClient } from '../api/createApiClient';
import type { ApiPlatform } from '../platform/platform.types';
import { ApiProvider } from '../provider/ApiProvider';
import { webPlatform } from './fixtures';

/**
 * Renders a hook inside a fresh `ApiProvider` (needs jsdom). Returns the clients too, so a
 * test can seed the cache or check the token. The provider restores the session on mount:
 * declare `/auth/refresh` before calling this.
 */
export function renderHookWithApiProvider<T>(hook: () => T, platform: ApiPlatform = webPlatform) {
  const apiClient: ApiClient = createApiClient(platform);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ApiProvider platform={platform} apiClient={apiClient} queryClient={queryClient}>
      {children}
    </ApiProvider>
  );
  return { ...renderHook(hook, { wrapper }), apiClient, queryClient };
}
