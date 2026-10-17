import { userDtoSchema } from '@callsign/types';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import type { ExclusiveRunner } from '../platform/platform.types';
import {
  apiError,
  authResponse,
  MemoryTokenStore,
  mobilePlatform,
  webPlatform,
  wolf,
} from '../test/fixtures';
import { api, server } from '../test/server';
import { createApiClient } from './createApiClient';

const me = { method: 'GET', path: '/auth/me' } as const;

/** `/auth/me` answers only to `validToken`; `/auth/refresh` hands out `newToken`, counting calls. */
function fakeAuthApi(validToken: string, newToken = validToken) {
  const refreshBodies: unknown[] = [];
  server.use(
    http.get(api('/auth/me'), ({ request }) =>
      request.headers.get('authorization') === `Bearer ${validToken}`
        ? HttpResponse.json(wolf)
        : apiError(401, 'UNAUTHORIZED'),
    ),
    http.post(api('/auth/refresh'), async ({ request }) => {
      refreshBodies.push(await request.json());
      await delay(10);
      return HttpResponse.json(authResponse(newToken, 'refresh-2'));
    }),
  );
  return refreshBodies;
}

describe('createApiClient', () => {
  it('sends the access token of the session', async () => {
    fakeAuthApi('access-1');
    const client = createApiClient(webPlatform);
    await client.startSession(authResponse('access-1'));

    await expect(client.request(me, userDtoSchema)).resolves.toEqual(wolf);
    expect(client.getAccessToken()).toBe('access-1');
  });

  it('refreshes on a 401 and retries the request once with the new token', async () => {
    const refreshBodies = fakeAuthApi('access-2');
    const client = createApiClient(webPlatform);
    await client.startSession(authResponse('expired'));

    await expect(client.request(me, userDtoSchema)).resolves.toEqual(wolf);
    expect(refreshBodies).toEqual([{}]); // web: the cookie carries the refresh token
    expect(client.getAccessToken()).toBe('access-2');
  });

  it('shares one refresh between concurrent 401s', async () => {
    const refreshBodies = fakeAuthApi('access-2');
    const client = createApiClient(webPlatform);
    await client.startSession(authResponse('expired'));

    const results = await Promise.all([1, 2, 3].map(() => client.request(me, userDtoSchema)));
    expect(results).toEqual([wolf, wolf, wolf]);
    expect(refreshBodies).toHaveLength(1);
  });

  it('reuses a token another call refreshed while this one was in flight', async () => {
    const refreshBodies: unknown[] = [];
    server.use(
      http.get(api('/auth/me'), async ({ request }) => {
        if (request.headers.get('authorization') === 'Bearer access-2')
          return HttpResponse.json(wolf);
        await delay(30); // the refresh below finishes first
        return apiError(401, 'UNAUTHORIZED');
      }),
      http.post(api('/auth/refresh'), async ({ request }) => {
        refreshBodies.push(await request.json());
        return HttpResponse.json(authResponse('access-2'));
      }),
    );
    const client = createApiClient(webPlatform);
    await client.startSession(authResponse('expired'));

    const pending = client.request(me, userDtoSchema);
    await client.refresh();
    await expect(pending).resolves.toEqual(wolf);
    expect(refreshBodies).toHaveLength(1);
  });

  it('gives up after one retry', async () => {
    fakeAuthApi('never-valid', 'still-rejected');
    const client = createApiClient(webPlatform);
    await expect(client.request(me, userDtoSchema)).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('ends the session when the refresh is refused', async () => {
    server.use(
      http.get(api('/auth/me'), () => apiError(401, 'UNAUTHORIZED')),
      http.post(api('/auth/refresh'), () => apiError(401, 'UNAUTHORIZED')),
    );
    const client = createApiClient(webPlatform);
    const ended = vi.fn();
    client.onSessionEnd(ended);
    await client.startSession(authResponse('expired'));

    await expect(client.request(me, userDtoSchema)).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    expect(ended).toHaveBeenCalledOnce();
    expect(client.getAccessToken()).toBeNull();
  });

  it('keeps the session when the refresh fails for another reason (offline)', async () => {
    server.use(
      http.get(api('/auth/me'), () => apiError(401, 'UNAUTHORIZED')),
      http.post(api('/auth/refresh'), () => HttpResponse.error()),
    );
    const client = createApiClient(webPlatform);
    const ended = vi.fn();
    client.onSessionEnd(ended);
    await client.startSession(authResponse('expired'));

    await expect(client.request(me, userDtoSchema)).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
    });
    expect(ended).not.toHaveBeenCalled();
    expect(client.getAccessToken()).toBe('expired');
  });

  it('stops calling a session-end listener once unsubscribed', async () => {
    server.use(http.post(api('/auth/refresh'), () => apiError(401, 'UNAUTHORIZED')));
    const client = createApiClient(webPlatform);
    const ended = vi.fn();
    client.onSessionEnd(ended)();
    await expect(client.refresh()).resolves.toBeNull();
    expect(ended).not.toHaveBeenCalled();
  });

  it('neither sends a token nor refreshes for auth: false', async () => {
    let authorization: string | null = 'unset';
    server.use(
      http.post(api('/auth/login'), ({ request }) => {
        authorization = request.headers.get('authorization');
        return apiError(401, 'INVALID_CREDENTIALS');
      }),
    );
    const client = createApiClient(webPlatform);
    await client.startSession(authResponse('access-1'));

    const login = { method: 'POST', path: '/auth/login', body: {}, auth: false } as const;
    await expect(client.request(login, userDtoSchema)).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    });
    expect(authorization).toBeNull();
  });

  it('resolves a 204 with requestNoContent', async () => {
    server.use(
      http.delete(api('/rooms/1/members/me'), () => new HttpResponse(null, { status: 204 })),
    );
    const client = createApiClient(webPlatform);
    await expect(
      client.requestNoContent({ method: 'DELETE', path: '/rooms/1/members/me' }),
    ).resolves.toBeUndefined();
  });

  it('runs the refresh under the platform lock', async () => {
    fakeAuthApi('access-2');
    const locks: string[] = [];
    const runExclusive: ExclusiveRunner = (name, task) => {
      locks.push(name);
      return task();
    };
    const client = createApiClient({ ...webPlatform, runExclusive });

    await client.refresh();
    expect(locks).toEqual(['callsign:auth-refresh']);
  });

  it('forgets the access token on endSession', async () => {
    const client = createApiClient(webPlatform);
    await client.startSession(authResponse('access-1'));
    await client.endSession();
    expect(client.getAccessToken()).toBeNull();
  });
});

describe('createApiClient on mobile', () => {
  it('stores the refresh token of a new session', async () => {
    const store = new MemoryTokenStore();
    const client = createApiClient(mobilePlatform(store));
    await client.startSession(authResponse('access-1', 'refresh-1'));
    expect(store.token).toBe('refresh-1');
  });

  it('refuses a session without a refresh token', async () => {
    const client = createApiClient(mobilePlatform(new MemoryTokenStore()));
    await expect(client.startSession(authResponse('access-1'))).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
    });
  });

  it('sends the stored refresh token and keeps the rotated one', async () => {
    const refreshBodies = fakeAuthApi('access-2');
    const store = new MemoryTokenStore('refresh-1');
    const client = createApiClient(mobilePlatform(store));

    await expect(client.refresh()).resolves.toMatchObject({ accessToken: 'access-2' });
    expect(refreshBodies).toEqual([{ refreshToken: 'refresh-1' }]);
    expect(store.token).toBe('refresh-2');
  });

  it('resolves null without a request when nothing is stored', async () => {
    const client = createApiClient(mobilePlatform(new MemoryTokenStore()));
    await expect(client.refresh()).resolves.toBeNull(); // an unhandled request would fail the test
  });

  it('clears the stored token when the session ends', async () => {
    server.use(http.post(api('/auth/refresh'), () => apiError(401, 'UNAUTHORIZED')));
    const store = new MemoryTokenStore('revoked');
    const client = createApiClient(mobilePlatform(store));

    await expect(client.refresh()).resolves.toBeNull();
    expect(store.token).toBeNull();
  });
});
