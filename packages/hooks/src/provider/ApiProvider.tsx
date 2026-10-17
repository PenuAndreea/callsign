import type { QueryClient } from '@tanstack/react-query';
import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

import type { ApiClient } from '../api/createApiClient';
import { createApiClient } from '../api/createApiClient';
import type { ApiPlatform } from '../platform/platform.types';
import { createQueryClient } from '../query/createQueryClient';
import { SessionContext } from '../session/SessionContext';
import { createSessionStore } from '../session/sessionStore';
import { ApiClientContext } from './ApiClientContext';

export interface ApiProviderProps {
  /** Read once, on mount: define it at module level in the app, not inline per render. */
  platform: ApiPlatform;
  /** For tests: a prebuilt client or query client. */
  apiClient?: ApiClient;
  queryClient?: QueryClient;
  children: ReactNode;
}

/**
 * Root of everything the shared hooks need: the API client (with its in-memory access token),
 * the TanStack Query cache and the session. All are created once and live as long as the app.
 * On mount the session restores itself from the refresh token (cookie or secure store).
 */
export function ApiProvider({ platform, apiClient, queryClient, children }: ApiProviderProps) {
  const [client] = useState(() => apiClient ?? createApiClient(platform));
  const [cache] = useState(() => queryClient ?? createQueryClient());
  const [session] = useState(() => createSessionStore(client, cache));

  // Subscribing is an effect, not part of creating the store: StrictMode runs initializers
  // twice, and only an effect gets a cleanup. A second `start` reuses the restore in flight.
  useEffect(() => session.start(), [session]);

  return (
    <ApiClientContext value={client}>
      <QueryClientProvider client={cache}>
        <SessionContext value={session}>{children}</SessionContext>
      </QueryClientProvider>
    </ApiClientContext>
  );
}
