import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';

import { ApiClientError } from '../api/ApiClientError';
import type { ErrorReporter } from '../errors/reportError';
import { consoleErrorReporter, isUnexpectedError } from '../errors/reportError';

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

/**
 * Which query errors crash to the nearest error boundary instead of reaching the screen: bugs
 * only (anything that is not an `ApiClientError`). An API error, even a 5xx or a broken response,
 * is something the screen can explain and retry, so it stays inline.
 */
export function throwsToBoundary(error: unknown): boolean {
  return !(error instanceof ApiClientError);
}

/**
 * Server state only. The session (who is signed in) lives outside the query cache.
 * Unexpected failures (after retries) go to `reportError`; expected ones only reach the screens.
 */
export function createQueryClient(reportError: ErrorReporter = consoleErrorReporter): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        if (isUnexpectedError(error)) reportError(error, { source: 'query', key: query.queryKey });
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, _variables, _onMutateResult, mutation) => {
        if (!isUnexpectedError(error)) return;
        const key = mutation.options.mutationKey;
        reportError(error, { source: 'mutation', ...(key && { key }) });
      },
    }),
    defaultOptions: {
      queries: {
        retry: shouldRetry,
        throwOnError: throwsToBoundary,
        // Live updates come over the socket; refetching on every mount would only add load.
        staleTime: 30_000,
      },
      // A mutation may have reached the API before failing (join, create): never repeat it blindly.
      mutations: { retry: false },
    },
  });
}
