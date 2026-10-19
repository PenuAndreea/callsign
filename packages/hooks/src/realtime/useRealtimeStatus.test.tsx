// @vitest-environment jsdom
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ApiProvider } from '../provider/ApiProvider';
import { authResponse, webPlatform } from '../test/fixtures';
import { api, server } from '../test/server';
import type { SocketTestServer } from '../test/socketServer';
import { startSocketTestServer } from '../test/socketServer';
import { useRealtimeStatus } from './useRealtimeStatus';

let sockets: SocketTestServer;

beforeEach(async () => {
  sockets = await startSocketTestServer();
  server.use(http.post(api('/auth/refresh'), () => HttpResponse.json(authResponse('access-1'))));
});

afterEach(async () => {
  cleanup();
  await sockets.close();
});

describe('useRealtimeStatus', () => {
  it('connects once the restored session is signed in, once under StrictMode', async () => {
    const platform = { ...webPlatform, createSocket: sockets.createSocket };
    const { result } = renderHook(() => useRealtimeStatus(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <StrictMode>
          <ApiProvider platform={platform}>{children}</ApiProvider>
        </StrictMode>
      ),
    });

    await waitFor(() => expect(result.current).toBe('connected'));
    expect(sockets.io.sockets.sockets.size).toBe(1);
  });

  it('stays disconnected with realtime off', async () => {
    const { result } = renderHook(() => useRealtimeStatus(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <ApiProvider platform={webPlatform}>{children}</ApiProvider>
      ),
    });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(result.current).toBe('disconnected');
    expect(sockets.handshakes).toEqual([]);
  });

  it('throws outside the provider', () => {
    expect(() => renderHook(() => useRealtimeStatus())).toThrow(/inside <ApiProvider>/);
  });
});
