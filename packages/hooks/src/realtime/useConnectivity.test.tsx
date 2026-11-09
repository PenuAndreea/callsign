// @vitest-environment jsdom
import { onlineManager } from '@tanstack/react-query';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ApiProvider } from '../provider/ApiProvider';
import { authResponse, webPlatform } from '../test/fixtures';
import { api, server } from '../test/server';
import type { SocketTestServer } from '../test/socketServer';
import { startSocketTestServer } from '../test/socketServer';
import { connectivityOf, useConnectivity } from './useConnectivity';

describe('connectivityOf', () => {
  it('is offline without a network, whatever the socket says', () => {
    expect(connectivityOf(false, 'connected')).toBe('offline');
    expect(connectivityOf(false, 'connecting')).toBe('offline');
  });

  it('has no signal with a network but no live socket', () => {
    expect(connectivityOf(true, 'connecting')).toBe('noSignal');
    expect(connectivityOf(true, 'disconnected')).toBe('noSignal');
  });

  it('is connected with a live socket', () => {
    expect(connectivityOf(true, 'connected')).toBe('connected');
  });
});

describe('useConnectivity', () => {
  let sockets: SocketTestServer;

  beforeEach(async () => {
    sockets = await startSocketTestServer();
    server.use(http.post(api('/auth/refresh'), () => HttpResponse.json(authResponse('access-1'))));
  });

  afterEach(async () => {
    cleanup();
    onlineManager.setOnline(true);
    await sockets.close();
  });

  it('follows the device network and the socket', async () => {
    const platform = { ...webPlatform, createSocket: sockets.createSocket };
    const { result } = renderHook(() => useConnectivity(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <ApiProvider platform={platform}>{children}</ApiProvider>
      ),
    });
    await waitFor(() => expect(result.current).toBe('connected'));

    act(() => onlineManager.setOnline(false));
    expect(result.current).toBe('offline');

    act(() => onlineManager.setOnline(true));
    expect(result.current).toBe('connected');

    // The socket cannot come back (its token is refused now): a network, but no signal.
    sockets.validTokens.clear();
    act(() => sockets.dropConnections());
    await waitFor(() => expect(result.current).toBe('noSignal'));
  });
});
