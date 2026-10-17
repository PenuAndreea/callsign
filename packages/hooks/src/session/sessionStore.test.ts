import { QueryClient } from '@tanstack/react-query';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import { createApiClient } from '../api/createApiClient';
import { apiError, authResponse, webPlatform, wolf } from '../test/fixtures';
import { api, server } from '../test/server';
import { createSessionStore } from './sessionStore';

function setup() {
  const apiClient = createApiClient(webPlatform);
  const queryClient = new QueryClient();
  const store = createSessionStore(apiClient, queryClient);
  return { apiClient, queryClient, store };
}

const refreshAnswers = (respond: () => Response | Promise<Response>) =>
  server.use(http.post(api('/auth/refresh'), respond));

describe('createSessionStore: restore', () => {
  it('starts as restoring', () => {
    expect(setup().store.getSnapshot()).toEqual({ status: 'restoring' });
  });

  it('signs in with the user of a valid refresh token', async () => {
    refreshAnswers(() => HttpResponse.json(authResponse('access-1')));
    const { store, apiClient } = setup();

    await store.restore();
    expect(store.getSnapshot()).toEqual({ status: 'signedIn', user: wolf });
    expect(apiClient.getAccessToken()).toBe('access-1');
  });

  it('is signed out when the API refuses the refresh token', async () => {
    refreshAnswers(() => apiError(401, 'UNAUTHORIZED'));
    const { store } = setup();
    await store.restore();
    expect(store.getSnapshot()).toEqual({ status: 'signedOut' });
  });

  it('is unreachable (not signed out) when the API cannot answer, and can retry', async () => {
    refreshAnswers(() => HttpResponse.error());
    const { store } = setup();
    await store.restore();
    expect(store.getSnapshot()).toEqual({ status: 'unreachable' });

    refreshAnswers(() => HttpResponse.json(authResponse('access-1')));
    await store.restore();
    expect(store.getSnapshot()).toMatchObject({ status: 'signedIn' });
  });

  it('shares one refresh between concurrent restores', async () => {
    let calls = 0;
    refreshAnswers(async () => {
      calls += 1;
      await delay(10);
      return HttpResponse.json(authResponse('access-1'));
    });
    const { store } = setup();

    await Promise.all([store.restore(), store.restore()]);
    expect(calls).toBe(1);
  });

  it('does not restore over a known session', async () => {
    let calls = 0;
    refreshAnswers(() => {
      calls += 1;
      return apiError(401, 'UNAUTHORIZED');
    });
    const { store } = setup();
    await store.restore();
    await store.restore();
    expect(calls).toBe(1);
    expect(store.getSnapshot()).toEqual({ status: 'signedOut' });
  });

  it('notifies subscribers of every change', async () => {
    refreshAnswers(() => HttpResponse.json(authResponse('access-1')));
    const { store } = setup();
    const statuses: string[] = [];
    store.subscribe(() => statuses.push(store.getSnapshot().status));

    await store.restore();
    expect(statuses).toEqual(['restoring', 'signedIn']);
  });
});

describe('createSessionStore: sign in and out', () => {
  it('signs in with an auth response and empties the cache of the previous user', async () => {
    const { store, apiClient, queryClient } = setup();
    queryClient.setQueryData(['nets'], ['someone else’s']);

    await store.signIn(authResponse('access-1'));
    expect(store.getSnapshot()).toEqual({ status: 'signedIn', user: wolf });
    expect(apiClient.getAccessToken()).toBe('access-1');
    expect(queryClient.getQueryData(['nets'])).toBeUndefined();
  });

  it('logs out on the API, forgets the token and empties the cache', async () => {
    const logoutBodies: unknown[] = [];
    server.use(
      http.post(api('/auth/logout'), async ({ request }) => {
        logoutBodies.push(await request.json());
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { store, apiClient, queryClient } = setup();
    await store.signIn(authResponse('access-1'));
    queryClient.setQueryData(['nets'], ['tower']);

    await store.signOut();
    expect(logoutBodies).toEqual([{}]);
    expect(store.getSnapshot()).toEqual({ status: 'signedOut' });
    expect(apiClient.getAccessToken()).toBeNull();
    expect(queryClient.getQueryData(['nets'])).toBeUndefined();
  });

  it('signs out even when the API cannot be reached', async () => {
    server.use(http.post(api('/auth/logout'), () => HttpResponse.error()));
    const { store } = setup();
    await store.signIn(authResponse('access-1'));

    await store.signOut();
    expect(store.getSnapshot()).toEqual({ status: 'signedOut' });
  });
});

describe('createSessionStore: start', () => {
  it('restores, then signs out when a request finds the session revoked', async () => {
    refreshAnswers(() => HttpResponse.json(authResponse('access-1')));
    const { store, apiClient, queryClient } = setup();
    store.start();
    await vi.waitFor(() => expect(store.getSnapshot().status).toBe('signedIn'));
    queryClient.setQueryData(['nets'], ['tower']);

    server.use(
      http.get(api('/rooms'), () => apiError(401, 'UNAUTHORIZED')),
      http.post(api('/auth/refresh'), () => apiError(401, 'UNAUTHORIZED')),
    );
    await expect(
      apiClient.requestNoContent({ method: 'GET', path: '/rooms' }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });

    expect(store.getSnapshot()).toEqual({ status: 'signedOut' });
    expect(queryClient.getQueryData(['nets'])).toBeUndefined();
  });

  it('stops listening after cleanup', async () => {
    refreshAnswers(() => HttpResponse.json(authResponse('access-1')));
    const { store, apiClient } = setup();
    const stop = store.start();
    await vi.waitFor(() => expect(store.getSnapshot().status).toBe('signedIn'));
    stop();

    refreshAnswers(() => apiError(401, 'UNAUTHORIZED'));
    await apiClient.refresh();
    expect(store.getSnapshot().status).toBe('signedIn');
  });
});

describe('createSessionStore: races', () => {
  it('keeps a sign-in that finishes while the restore is still in flight', async () => {
    refreshAnswers(async () => {
      await delay(20);
      return apiError(401, 'UNAUTHORIZED');
    });
    const { store, apiClient } = setup();

    const restoring = store.restore();
    await store.signIn(authResponse('access-login'));
    await restoring;

    expect(store.getSnapshot()).toEqual({ status: 'signedIn', user: wolf });
    expect(apiClient.getAccessToken()).toBe('access-login');
  });
});
