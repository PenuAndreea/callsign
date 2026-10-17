import { QueryClient } from '@tanstack/react-query';

import { ApiClientError } from '../api/ApiClientError';

const MAX_RETRIES = 2;

/**
 * Retry only what can succeed on a second try: network errors and 5xx. A 4xx (not a member,
 * not found, validation) gives the same answer every time; 401s are already refreshed and
 * retried once by the API client.
 */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= MAX_RETRIES) return false;
  if (!(error instanceof ApiClientError)) return false;
  return error.code === 'NETWORK_ERROR' || error.status >= 500;
}

/** Server state only. The session (who is signed in) lives outside the query cache. */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: shouldRetry,
        // Live updates come over the socket; refetching on every mount would only add load.
        staleTime: 30_000,
      },
      // A mutation may have reached the API before failing (join, create): never repeat it blindly.
      mutations: { retry: false },
    },
  });
}
