import type { QueryClient } from '@tanstack/react-query';
import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useState } from 'react';

import type { ApiClient } from '../api/createApiClient';
import { createApiClient } from '../api/createApiClient';
import type { CallsignPlatform } from '../platform/platform.types';
import { createQueryClient } from '../query/createQueryClient';
import { ApiClientContext } from './ApiClientContext';

export interface CallsignProviderProps {
  /** Read once, on mount: define it at module level in the app, not inline per render. */
  platform: CallsignPlatform;
  /** For tests: a prebuilt client or query client. */
  apiClient?: ApiClient;
  queryClient?: QueryClient;
  children: ReactNode;
}

/**
 * Root of everything the shared hooks need: the API client (with its in-memory access token)
 * and the TanStack Query cache. Both are created once and live as long as the app.
 */
export function CallsignProvider({
  platform,
  apiClient,
  queryClient,
  children,
}: CallsignProviderProps) {
  const [client] = useState(() => apiClient ?? createApiClient(platform));
  const [cache] = useState(() => queryClient ?? createQueryClient());

  return (
    <ApiClientContext value={client}>
      <QueryClientProvider client={cache}>{children}</QueryClientProvider>
    </ApiClientContext>
  );
}
