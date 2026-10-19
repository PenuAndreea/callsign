import type { MessageDto } from '@callsign/types';
import { QueryClient, QueryObserver } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createApiClient } from '../api/createApiClient';
import { netKeys } from '../nets/netKeys';
import { createSessionStore } from '../session/sessionStore';
import { apiError, authResponse, net, page, webPlatform } from '../test/fixtures';
import { api, server } from '../test/server';
import type { SocketTestServer } from '../test/socketServer';
import { startSocketTestServer } from '../test/socketServer';
import type { ErrorReporter } from '../errors/reportError';
import { createRealtime } from './createRealtime';

let sockets: SocketTestServer;
let stop: (() => void) | undefined;
let reportError: ReturnType<typeof vi.fn<ErrorReporter>>;

beforeEach(async () => {
  reportError = vi.fn<ErrorReporter>();
  sockets = await startSocketTestServer();
});

afterEach(async () => {
  stop?.();
  stop = undefined;
  await sockets.close();
});

/**
 * A signed-in client with the given access token, and its realtime layer started. `refresh`
 * answers `/auth/refresh` from then on (the startup restore always finds no session).
 */
async function signedIn(accessToken = 'access-1', refresh?: () => Response) {
  const apiClient = createApiClient(webPlatform);
  const queryClient = new QueryClient();
  const session = createSessionStore(apiClient, queryClient);
  const stopSession = session.start();
  // `start()` restores; answer it as signed out, then sign in with the token under test.
  await vi.waitFor(() => expect(session.getSnapshot().status).toBe('signedOut'));
  await session.signIn(authResponse(accessToken));
  if (refresh) server.use(http.post(api('/auth/refresh'), refresh));
  const realtime = createRealtime({
    api: apiClient,
    queryClient,
    session,
    createSocket: sockets.createSocket,
    reportError,
  });
  const stopRealtime = realtime.start();
  stop = () => {
    stopRealtime();
    stopSession();
  };
  return { apiClient, queryClient, session, realtime };
}

const connected = (realtime: { getStatus(): string }) =>
  vi.waitFor(() => expect(realtime.getStatus()).toBe('connected'));

beforeEach(() => {
  server.use(http.post(api('/auth/refresh'), () => apiError(401, 'UNAUTHORIZED')));
});

describe('createRealtime: connection', () => {
  it('connects with the access token once signed in', async () => {
    const { realtime } = await signedIn();
    await connected(realtime);
    expect(sockets.handshakes).toEqual(['access-1']);
  });

  it('closes the socket on sign out', async () => {
    server.use(http.post(api('/auth/logout'), () => new HttpResponse(null, { status: 204 })));
    const { realtime, session } = await signedIn();
    await connected(realtime);

    await session.signOut();
    expect(realtime.getStatus()).toBe('disconnected');
    expect(realtime.getSocket()).toBeNull();
    await vi.waitFor(() => expect(sockets.io.sockets.sockets.size).toBe(0));
  });

  it('opens no socket with realtime off', async () => {
    const apiClient = createApiClient(webPlatform);
    const queryClient = new QueryClient();
    const session = createSessionStore(apiClient, queryClient);
    await session.signIn(authResponse('access-1'));
    const realtime = createRealtime({ api: apiClient, queryClient, session, createSocket: null });

    realtime.start();
    expect(realtime.getSocket()).toBeNull();
    expect(realtime.getStatus()).toBe('disconnected');
  });
});

describe('createRealtime: refused handshake', () => {
  it('refreshes an expired token and reconnects with the new one', async () => {
    sockets.validTokens.add('access-2');
    const { realtime } = await signedIn('expired', () =>
      HttpResponse.json(authResponse('access-2')),
    );

    await connected(realtime);
    expect(sockets.handshakes).toEqual(['expired', 'access-2']);
  });

  it('signs out when the refresh ends the session', async () => {
    const { realtime, session } = await signedIn('revoked');

    await vi.waitFor(() => expect(session.getSnapshot().status).toBe('signedOut'));
    expect(realtime.getStatus()).toBe('disconnected');
    expect(realtime.getSocket()).toBeNull();
  });

  it('stops refreshing when a fresh token is refused too', async () => {
    let refreshes = 0;
    const { realtime } = await signedIn('expired', () => {
      refreshes += 1;
      return HttpResponse.json(authResponse(`still-refused-${refreshes}`));
    });

    await vi.waitFor(() => expect(sockets.handshakes).toHaveLength(3));
    await vi.waitFor(() => expect(realtime.getStatus()).toBe('disconnected'));
    expect(refreshes).toBe(2);
  });
});

describe('createRealtime: catching up after a reconnect', () => {
  it('marks nets data from before the reconnect as stale', async () => {
    const { realtime, queryClient } = await signedIn();
    await connected(realtime);
    queryClient.setQueryData(netKeys.detail('tower'), net('tower'));

    sockets.dropConnections();
    await vi.waitFor(() => expect(sockets.handshakes).toHaveLength(2));
    await connected(realtime);

    expect(queryClient.getQueryState(netKeys.detail('tower'))?.isInvalidated).toBe(true);
  });

  it('refetches open nets data that failed to load', async () => {
    const { realtime, queryClient } = await signedIn();
    await connected(realtime);
    const queryFn = vi.fn(() => Promise.reject(new Error('offline')));
    // Subscribed like an open screen: only active queries refetch.
    const unsubscribe = new QueryObserver(queryClient, {
      queryKey: netKeys.detail('tower'),
      queryFn,
      retry: false,
    }).subscribe(() => undefined);
    await vi.waitFor(() =>
      expect(queryClient.getQueryState(netKeys.detail('tower'))?.status).toBe('error'),
    );

    sockets.dropConnections();
    await vi.waitFor(() => expect(sockets.handshakes).toHaveLength(2));
    await connected(realtime);

    await vi.waitFor(() => expect(queryFn).toHaveBeenCalledTimes(2));
    unsubscribe();
  });

  it('leaves a first fetch still in flight alone', async () => {
    const { realtime, queryClient } = await signedIn();
    await connected(realtime);
    void queryClient.prefetchQuery({
      queryKey: netKeys.detail('tower'),
      queryFn: () => new Promise<never>(() => undefined),
    });

    sockets.dropConnections();
    await vi.waitFor(() => expect(sockets.handshakes).toHaveLength(2));
    await connected(realtime);

    expect(queryClient.getQueryState(netKeys.detail('tower'))?.isInvalidated).toBe(false);
  });
});

describe('createRealtime: live events', () => {
  const tower = net('tower', { memberCount: 2 });
  const message = (content: string, createdAt: string): MessageDto => ({
    id: `m-${createdAt}`,
    roomId: tower.id,
    sender: { id: 'u1', callsign: 'eagle-1' },
    content,
    createdAt,
  });

  async function withCachedTower() {
    const setup = await signedIn();
    await connected(setup.realtime);
    setup.queryClient.setQueryData(netKeys.list('joined'), {
      pages: [page([tower])],
      pageParams: [undefined],
    });
    setup.queryClient.setQueryData(netKeys.detail(tower.id), tower);
    return setup;
  }

  const cachedTower = (queryClient: QueryClient) =>
    queryClient.getQueryData<{ pages: { items: (typeof tower)[] }[] }>(netKeys.list('joined'))
      ?.pages[0]?.items[0];

  it('puts a new message in the net preview, cut like the API', async () => {
    const { queryClient } = await withCachedTower();

    sockets.io.emit('message:new', message('x'.repeat(100), '2026-10-17T22:15:00.000Z'));
    await vi.waitFor(() =>
      expect(cachedTower(queryClient)?.lastMessage?.createdAt).toBe('2026-10-17T22:15:00.000Z'),
    );
    expect(Array.from(cachedTower(queryClient)?.lastMessage?.content ?? '')).toHaveLength(80);
    expect(queryClient.getQueryData<typeof tower>(netKeys.detail(tower.id))?.lastMessage).toEqual(
      cachedTower(queryClient)?.lastMessage,
    );
  });

  it('never replaces a newer preview with an older message', async () => {
    const { queryClient } = await withCachedTower();

    sockets.io.emit('message:new', message('Newer. Over.', '2026-10-17T22:16:00.000Z'));
    sockets.io.emit('message:new', message('Older. Over.', '2026-10-17T22:15:00.000Z'));
    await vi.waitFor(() =>
      expect(cachedTower(queryClient)?.lastMessage?.content).toBe('Newer. Over.'),
    );
    // Give the older event time to arrive; it must not win.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(cachedTower(queryClient)?.lastMessage?.content).toBe('Newer. Over.');
  });

  it('updates the member count in the lists and the detail', async () => {
    const { queryClient } = await withCachedTower();

    sockets.io.emit('room:updated', { id: tower.id, memberCount: 3 });
    await vi.waitFor(() => expect(cachedTower(queryClient)?.memberCount).toBe(3));
    expect(queryClient.getQueryData<typeof tower>(netKeys.detail(tower.id))?.memberCount).toBe(3);
  });

  it('reports and drops a message:new that breaks the contract', async () => {
    const { queryClient } = await withCachedTower();

    sockets.io.emit('message:new', {
      ...message('Over.', '2026-10-17T22:15:00.000Z'),
      content: '',
    });
    sockets.io.emit('message:new', message('Valid. Over.', '2026-10-17T22:16:00.000Z'));
    await vi.waitFor(() =>
      expect(cachedTower(queryClient)?.lastMessage?.content).toBe('Valid. Over.'),
    );
    expect(reportError).toHaveBeenCalledOnce();
    expect(reportError).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'INVALID_RESPONSE' }),
      { source: 'realtime', key: ['message:new'] },
    );
  });

  it('reports and drops a room:updated that breaks the contract', async () => {
    const { queryClient } = await withCachedTower();

    sockets.io.emit('room:updated', { id: tower.id, memberCount: -1 });
    sockets.io.emit('room:updated', { id: tower.id, memberCount: 5 });
    await vi.waitFor(() => expect(cachedTower(queryClient)?.memberCount).toBe(5));
    expect(reportError).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'INVALID_RESPONSE' }),
      { source: 'realtime', key: ['room:updated'] },
    );
  });
});
