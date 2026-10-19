// @vitest-environment jsdom
import { useMutation, useQuery } from '@tanstack/react-query';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { http } from 'msw';
import type { ReactNode } from 'react';
import { Component } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiClientError } from '../api/ApiClientError';
import type { ApiPlatform } from '../platform/platform.types';
import { ApiProvider } from '../provider/ApiProvider';
import { apiError, webPlatform } from '../test/fixtures';
import { api, server } from '../test/server';
import type { ErrorReporter } from './reportError';
import { consoleErrorReporter } from './reportError';
import { useReportError } from './useReportError';

beforeEach(() => {
  server.use(http.post(api('/auth/refresh'), () => apiError(401, 'UNAUTHORIZED')));
});

afterEach(cleanup);

function wrapperFor(platform: ApiPlatform) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <ApiProvider platform={platform}>{children}</ApiProvider>;
  };
}

/** The smallest error boundary, enough to see what a render throws. */
class Boundary extends Component<{ onCatch: (error: unknown) => void; children: ReactNode }> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidCatch(error: unknown) {
    this.props.onCatch(error);
  }

  override render() {
    return this.state.failed ? null : this.props.children;
  }
}

describe('useReportError', () => {
  it("returns the platform's reporter", () => {
    const reportError: ErrorReporter = vi.fn();
    const { result } = renderHook(useReportError, {
      wrapper: wrapperFor({ ...webPlatform, reportError }),
    });
    expect(result.current).toBe(reportError);
  });

  it('falls back to the console', () => {
    const { result } = renderHook(useReportError, { wrapper: wrapperFor(webPlatform) });
    expect(result.current).toBe(consoleErrorReporter);
  });

  it('throws outside ApiProvider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => renderHook(useReportError)).toThrow(/inside <ApiProvider>/);
    vi.restoreAllMocks();
  });
});

describe('reporting through the query cache', () => {
  it('reports a failing query that is a bug, with its key', async () => {
    const reportError = vi.fn<ErrorReporter>();
    const bug = new TypeError('x is undefined');
    const { result } = renderHook(
      () =>
        useQuery({
          queryKey: ['broken'],
          queryFn: () => Promise.reject(bug),
          retry: false,
          // Stay on the screen so the test can read the state; the next test covers the throw.
          throwOnError: false,
        }),
      { wrapper: wrapperFor({ ...webPlatform, reportError }) },
    );
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(reportError).toHaveBeenCalledWith(bug, { source: 'query', key: ['broken'] });
  });

  it('throws a bug to the nearest error boundary, and keeps API errors inline', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const caught: unknown[] = [];
    const platform = { ...webPlatform, reportError: vi.fn<ErrorReporter>() };
    const bug = new TypeError('x is undefined');
    const notFound = new ApiClientError(404, 'NOT_FOUND', 'off the air');
    renderHook(() => useQuery({ queryKey: ['bug'], queryFn: () => Promise.reject(bug) }), {
      wrapper: ({ children }) => (
        <ApiProvider platform={platform}>
          <Boundary onCatch={(error) => caught.push(error)}>{children}</Boundary>
        </ApiProvider>
      ),
    });
    const { result } = renderHook(
      () => useQuery({ queryKey: ['gone'], queryFn: () => Promise.reject(notFound) }),
      { wrapper: wrapperFor(platform) },
    );
    await waitFor(() => expect(caught).toEqual([bug]));
    await waitFor(() => expect(result.current.error).toBe(notFound));
    vi.restoreAllMocks();
  });

  it('does not report an expected API error', async () => {
    const reportError = vi.fn<ErrorReporter>();
    const notMember = new ApiClientError(403, 'NOT_A_MEMBER', 'join first');
    const { result } = renderHook(
      () => useQuery({ queryKey: ['history'], queryFn: () => Promise.reject(notMember) }),
      { wrapper: wrapperFor({ ...webPlatform, reportError }) },
    );
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(reportError).not.toHaveBeenCalled();
  });

  it('reports a failing mutation that is a bug, with its key when it has one', async () => {
    const reportError = vi.fn<ErrorReporter>();
    const bug = new RangeError('bad index');
    const { result } = renderHook(
      () => ({
        keyed: useMutation({ mutationKey: ['join'], mutationFn: () => Promise.reject(bug) }),
        unkeyed: useMutation({ mutationFn: () => Promise.reject(bug) }),
      }),
      { wrapper: wrapperFor({ ...webPlatform, reportError }) },
    );
    result.current.keyed.mutate();
    result.current.unkeyed.mutate();
    await waitFor(() => expect(reportError).toHaveBeenCalledTimes(2));
    expect(reportError).toHaveBeenCalledWith(bug, { source: 'mutation', key: ['join'] });
    expect(reportError).toHaveBeenCalledWith(bug, { source: 'mutation' });
  });
});
