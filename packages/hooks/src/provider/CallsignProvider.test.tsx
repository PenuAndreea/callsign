// @vitest-environment jsdom
import { QueryClient, useQueryClient } from '@tanstack/react-query';
import { cleanup, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { createApiClient } from '../api/createApiClient';
import { webPlatform } from '../test/fixtures';
import { CallsignProvider } from './CallsignProvider';
import { useApiClient } from './useApiClient';

afterEach(cleanup);

function wrapper({ children }: { children: ReactNode }) {
  return <CallsignProvider platform={webPlatform}>{children}</CallsignProvider>;
}

describe('CallsignProvider', () => {
  it('keeps one API client and one query cache across renders', () => {
    const { result, rerender } = renderHook(
      () => ({ api: useApiClient(), cache: useQueryClient() }),
      { wrapper },
    );
    const first = result.current;
    rerender();
    expect(result.current.api).toBe(first.api);
    expect(result.current.cache).toBe(first.cache);
  });

  it('uses the clients passed in (tests)', () => {
    const apiClient = createApiClient(webPlatform);
    const queryClient = new QueryClient();
    const { result } = renderHook(() => ({ api: useApiClient(), cache: useQueryClient() }), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <CallsignProvider platform={webPlatform} apiClient={apiClient} queryClient={queryClient}>
          {children}
        </CallsignProvider>
      ),
    });
    expect(result.current.api).toBe(apiClient);
    expect(result.current.cache).toBe(queryClient);
  });
});

describe('useApiClient', () => {
  it('throws outside the provider', () => {
    expect(() => renderHook(() => useApiClient())).toThrow(/inside <CallsignProvider>/);
  });
});
