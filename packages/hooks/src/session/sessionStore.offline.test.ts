import { QueryClient } from '@tanstack/react-query';
import { delay, http, HttpResponse } from 'msw';
import { z } from 'zod';
import { describe, expect, it, vi } from 'vitest';

import { createApiClient } from '../api/createApiClient';
import { netKeys } from '../nets/netKeys';
import { createPendingStore } from '../messages/pendingStore';
import { createCachePersistence } from '../storage/cachePersistence';
import { createOfflineData, USER_KEY } from '../storage/offlineData';
import { createOutboxPersistence } from '../storage/outboxPersistence';
import { apiError, authResponse, MemoryOfflineStorage, webPlatform, wolf } from '../test/fixtures';
import { api, server } from '../test/server';
import { createSessionStore } from './sessionStore';

/** A session store on real offline data (saved cache + last user) in memory. */
function setup(offline = new MemoryOfflineStorage()) {
  const apiClient = createApiClient(webPlatform);
  const queryClient = new QueryClient();
  const reportError = vi.fn();
  const persistence = createCachePersistence({ queryClient, storage: offline, reportError });
  const pending = createPendingStore();
  const outbox = createOutboxPersistence({ pending, storage: offline, reportError });
  const offlineData = createOfflineData({ storage: offline, persistence, outbox, reportError });
  const store = createSessionStore(apiClient, queryClient, offlineData);
  return { apiClient, queryClient, offline, pending, store };
}

const refreshAnswers = (respond: () => Response | Promise<Response>) =>
  server.use(http.post(api('/auth/refresh'), respond));

/** A device where wolf-2 was signed in, with the joined nets saved. */
function deviceWithSavedSession(): MemoryOfflineStorage {
  const offline = new MemoryOfflineStorage();
  offline.items.set(USER_KEY, JSON.stringify(wolf));
  const query = {
    queryKey: netKeys.detail('n1'),
    queryHash: JSON.stringify(netKeys.detail('n1')),
    state: { data: { id: 'n1' }, dataUpdatedAt: 1, status: 'success', fetchStatus: 'idle' },
  };
  const clientState = { mutations: [], queries: [query] };
  offline.items.set(
    'query-cache',
    JSON.stringify({ buster: '1', timestamp: Date.now(), clientState }),
  );
  return offline;
}

describe('createSessionStore: offline storage', () => {
  it('wipes it before a sign-in shows the new user', async () => {
    const { store, offline } = setup();
    await offline.setItem('cache', 'someone else’s nets');
    let savedWhenSignedIn: string | null = 'not signed in';
    store.subscribe(() => {
      if (store.getSnapshot().status === 'signedIn')
        savedWhenSignedIn = offline.items.get('cache') ?? null;
    });

    await store.signIn(authResponse('access-1'));
    expect(savedWhenSignedIn).toBeNull();
  });

  it('wipes it on sign-out', async () => {
    server.use(http.post(api('/auth/logout'), () => new HttpResponse(null, { status: 204 })));
    const { store, offline } = setup();
    await store.signIn(authResponse('access-1'));
    await offline.setItem('cache', 'tower');

    await store.signOut();
    expect(offline.items.size).toBe(0);
  });

  it('wipes it when the restore finds the session over', async () => {
    refreshAnswers(() => apiError(401, 'UNAUTHORIZED'));
    const { store, offline } = setup(deviceWithSavedSession());

    await store.restore();
    expect(store.getSnapshot()).toEqual({ status: 'signedOut' });
    expect(offline.items.size).toBe(0);
  });

  it('loads it before the restore decides the session', async () => {
    refreshAnswers(() => HttpResponse.json(authResponse('access-1')));
    let loaded = false;
    const store = createSessionStore(createApiClient(webPlatform), new QueryClient(), {
      load: async () => {
        await delay(30);
        loaded = true;
        return null;
      },
      saveUser: () => Promise.resolve(),
      wipe: () => Promise.resolve(),
    });
    let loadedWhenSignedIn = false;
    store.subscribe(() => {
      if (store.getSnapshot().status === 'signedIn') loadedWhenSignedIn = loaded;
    });

    await store.restore();
    expect(loadedWhenSignedIn).toBe(true);
  });

  it('remembers who signed in, and who a restore found', async () => {
    const signingIn = setup();
    await signingIn.store.signIn(authResponse('access-1'));
    await vi.waitFor(() =>
      expect(signingIn.offline.items.get(USER_KEY)).toBe(JSON.stringify(wolf)),
    );

    refreshAnswers(() => HttpResponse.json(authResponse('access-2')));
    const restoring = setup();
    await restoring.store.restore();
    await vi.waitFor(() =>
      expect(restoring.offline.items.get(USER_KEY)).toBe(JSON.stringify(wolf)),
    );
  });
});

describe('createSessionStore: start without an answer', () => {
  it('is unreachable when nobody was signed in on this device', async () => {
    refreshAnswers(() => HttpResponse.error());
    const { store } = setup();
    await store.restore();
    expect(store.getSnapshot()).toEqual({ status: 'unreachable' });
  });

  it('opens signed in as the saved station, on the saved cache', async () => {
    refreshAnswers(() => HttpResponse.error());
    const { store, queryClient, offline } = setup(deviceWithSavedSession());

    await store.restore();
    expect(store.getSnapshot()).toEqual({ status: 'signedIn', user: wolf });
    expect(queryClient.getQueryData(netKeys.detail('n1'))).toEqual({ id: 'n1' });
    expect(offline.items.has(USER_KEY)).toBe(true);
  });

  it('brings back the unsent messages before it opens', async () => {
    refreshAnswers(() => HttpResponse.error());
    const offline = deviceWithSavedSession();
    const unsent = {
      clientMessageId: 'c0ffee00-0000-4000-8000-000000000001',
      roomId: 'n1',
      content: 'Written offline. Over.',
      createdAt: '2026-10-17T22:14:00.000Z',
      status: 'sending',
      error: null,
    };
    offline.items.set(`outbox:${unsent.clientMessageId}`, JSON.stringify(unsent));
    const { store, pending } = setup(offline);

    await store.restore();
    expect(store.getSnapshot().status).toBe('signedIn');
    expect(pending.list('n1')).toEqual([{ ...unsent, status: 'queued' }]);
  });

  it('also on a server failure (no answer about the session)', async () => {
    refreshAnswers(() => apiError(503, 'INTERNAL_ERROR'));
    const { store } = setup(deviceWithSavedSession());
    await store.restore();
    expect(store.getSnapshot()).toEqual({ status: 'signedIn', user: wolf });
  });

  it('ignores a saved station that does not match the schema', async () => {
    refreshAnswers(() => HttpResponse.error());
    const offline = new MemoryOfflineStorage();
    offline.items.set(USER_KEY, JSON.stringify({ callsign: 'wolf-2' }));
    const { store } = setup(offline);

    await store.restore();
    expect(store.getSnapshot()).toEqual({ status: 'unreachable' });
  });

  it('signs out and wipes once the API says the unverified session is over', async () => {
    refreshAnswers(() => HttpResponse.error());
    const { store, apiClient, offline } = setup(deviceWithSavedSession());
    const stop = store.start();
    await vi.waitFor(() => expect(store.getSnapshot().status).toBe('signedIn'));

    // Back online: the first request has no access token, and its refresh finds the session over.
    refreshAnswers(() => apiError(401, 'UNAUTHORIZED'));
    server.use(http.get(api('/rooms/n1'), () => apiError(401, 'UNAUTHORIZED')));
    await expect(
      apiClient.request({ method: 'GET', path: '/rooms/n1' }, z.unknown()),
    ).rejects.toThrow();

    expect(store.getSnapshot()).toEqual({ status: 'signedOut' });
    await vi.waitFor(() => expect(offline.items.size).toBe(0));
    stop();
  });
});
