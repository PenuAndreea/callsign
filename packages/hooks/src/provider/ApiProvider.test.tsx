// @vitest-environment jsdom
import { QueryClient, useQueryClient } from '@tanstack/react-query';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { http } from 'msw';
import type { ReactNode } from 'react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createApiClient } from '../api/createApiClient';
import { useSession } from '../session/useSession';
import { apiError, webPlatform } from '../test/fixtures';
import { api, server } from '../test/server';
import { ApiProvider } from './ApiProvider';
import { useApiClient } from './useApiClient';

let refreshCalls: number;

beforeEach(() => {
  refreshCalls = 0;
  server.use(
    http.post(api('/auth/refresh'), () => {
      refreshCalls += 1;
      return apiError(401, 'UNAUTHORIZED');
    }),
  );
});

afterEach(cleanup);

function wrapper({ children }: { children: ReactNode }) {
  return <ApiProvider platform={webPlatform}>{children}</ApiProvider>;
}

describe('ApiProvider', () => {
  it('keeps one API client and one query cache across renders', async () => {
    const { result, rerender } = renderHook(
      () => ({ api: useApiClient(), cache: useQueryClient(), session: useSession().session }),
      { wrapper },
    );
    const first = result.current;
    rerender();
    expect(result.current.api).toBe(first.api);
    expect(result.current.cache).toBe(first.cache);
    await waitFor(() => expect(result.current.session.status).toBe('signedOut'));
  });

  it('uses the clients passed in (tests)', async () => {
    const apiClient = createApiClient(webPlatform);
    const queryClient = new QueryClient();
    const { result } = renderHook(
      () => ({ api: useApiClient(), cache: useQueryClient(), session: useSession().session }),
      {
        wrapper: ({ children }: { children: ReactNode }) => (
          <ApiProvider platform={webPlatform} apiClient={apiClient} queryClient={queryClient}>
            {children}
          </ApiProvider>
        ),
      },
    );
    expect(result.current.api).toBe(apiClient);
    expect(result.current.cache).toBe(queryClient);
    await waitFor(() => expect(result.current.session.status).toBe('signedOut'));
  });

  it('restores once under StrictMode (effects run twice in development)', async () => {
    const { result } = renderHook(() => useSession().session, {
      wrapper: ({ children }: { children: ReactNode }) => (
        <StrictMode>{wrapper({ children })}</StrictMode>
      ),
    });
    await waitFor(() => expect(result.current.status).toBe('signedOut'));
    expect(refreshCalls).toBe(1);
  });
});

describe('useApiClient', () => {
  it('throws outside the provider', () => {
    expect(() => renderHook(() => useApiClient())).toThrow(/inside <ApiProvider>/);
  });
});
