import type { QueryClient } from '@tanstack/react-query';
import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

import type { ApiClient } from '../api/createApiClient';
import { createApiClient } from '../api/createApiClient';
import { ErrorReporterContext } from '../errors/ErrorReporterContext';
import { consoleErrorReporter } from '../errors/reportError';
import type { ApiPlatform } from '../platform/platform.types';
import { createQueryClient } from '../query/createQueryClient';
import { createRealtime } from '../realtime/createRealtime';
import { RealtimeContext } from '../realtime/RealtimeContext';
import { resolveSocketFactory } from '../realtime/resolveSocketFactory';
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
 * the TanStack Query cache, the session and the realtime socket. All are created once and live
 * as long as the app. On mount the session restores itself from the refresh token (cookie or
 * secure store); while signed in, one socket feeds live events into the cache.
 */
export function ApiProvider({ platform, apiClient, queryClient, children }: ApiProviderProps) {
  const [reportError] = useState(() => platform.reportError ?? consoleErrorReporter);
  const [client] = useState(() => apiClient ?? createApiClient(platform));
  const [cache] = useState(() => queryClient ?? createQueryClient(reportError));
  const [session] = useState(() => createSessionStore(client, cache));
  const [realtime] = useState(() =>
    createRealtime({
      api: client,
      queryClient: cache,
      session,
      createSocket: resolveSocketFactory(platform),
      reportError,
    }),
  );

  // Subscribing is an effect, not part of creating the store: StrictMode runs initializers
  // twice, and only an effect gets a cleanup. A second `start` reuses the restore in flight.
  useEffect(() => session.start(), [session]);
  useEffect(() => realtime.start(), [realtime]);

  return (
    <ErrorReporterContext value={reportError}>
      <ApiClientContext value={client}>
        <QueryClientProvider client={cache}>
          <SessionContext value={session}>
            <RealtimeContext value={realtime}>{children}</RealtimeContext>
          </SessionContext>
        </QueryClientProvider>
      </ApiClientContext>
    </ErrorReporterContext>
  );
}
