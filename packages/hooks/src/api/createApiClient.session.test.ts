import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import {
  apiError,
  authResponse,
  MemoryTokenStore,
  mobilePlatform,
  webPlatform,
} from '../test/fixtures';
import { api, server } from '../test/server';
import { createApiClient } from './createApiClient';

function recordLogouts(): unknown[] {
  const bodies: unknown[] = [];
  server.use(
    http.post(api('/auth/logout'), async ({ request }) => {
      bodies.push(await request.json());
      return new HttpResponse(null, { status: 204 });
    }),
  );
  return bodies;
}

describe('ApiClient.logout', () => {
  it('web: sends an empty body (the cookie carries the token)', async () => {
    const bodies = recordLogouts();
    const client = createApiClient(webPlatform);
    await client.startSession(authResponse('access-1'));

    await client.logout();
    expect(bodies).toEqual([{}]);
    expect(client.getAccessToken()).toBeNull();
  });

  it('mobile: sends the stored refresh token, then clears it', async () => {
    const bodies = recordLogouts();
    const store = new MemoryTokenStore('refresh-1');
    const client = createApiClient(mobilePlatform(store));

    await client.logout();
    expect(bodies).toEqual([{ refreshToken: 'refresh-1' }]);
    expect(store.token).toBeNull();
  });

  it('mobile: makes no request when nothing is stored', async () => {
    const client = createApiClient(mobilePlatform(new MemoryTokenStore()));
    await expect(client.logout()).resolves.toBeUndefined();
  });

  it('signs out locally when the API cannot be reached', async () => {
    server.use(http.post(api('/auth/logout'), () => HttpResponse.error()));
    const store = new MemoryTokenStore('refresh-1');
    const client = createApiClient(mobilePlatform(store));
    await client.startSession(authResponse('access-1', 'refresh-1'));

    await client.logout();
    expect(client.getAccessToken()).toBeNull();
    expect(store.token).toBeNull();
  });

  it('waits for a refresh in flight and revokes the rotated token', async () => {
    const bodies = recordLogouts();
    server.use(
      http.post(api('/auth/refresh'), async () => {
        await delay(20);
        return HttpResponse.json(authResponse('access-2', 'refresh-2'));
      }),
    );
    const store = new MemoryTokenStore('refresh-1');
    const client = createApiClient(mobilePlatform(store));

    const refreshing = client.refresh();
    await client.logout();
    await refreshing;
    expect(bodies).toEqual([{ refreshToken: 'refresh-2' }]);
    expect(store.token).toBeNull();
    expect(client.getAccessToken()).toBeNull();
  });
});

describe('ApiClient: a late refresh answer never replaces a newer session', () => {
  it('keeps the login token when an older refresh succeeds afterwards', async () => {
    server.use(
      http.post(api('/auth/refresh'), async () => {
        await delay(20);
        return HttpResponse.json(authResponse('access-old', 'refresh-old'));
      }),
    );
    const store = new MemoryTokenStore('refresh-1');
    const client = createApiClient(mobilePlatform(store));

    const refreshing = client.refresh();
    await client.startSession(authResponse('access-login', 'refresh-login'));

    await expect(refreshing).resolves.toBeNull();
    expect(client.getAccessToken()).toBe('access-login');
    expect(store.token).toBe('refresh-login');
  });

  it('keeps the login token when an older refresh is refused afterwards', async () => {
    server.use(
      http.post(api('/auth/refresh'), async () => {
        await delay(20);
        return apiError(401, 'UNAUTHORIZED');
      }),
    );
    const client = createApiClient(webPlatform);

    const refreshing = client.refresh();
    await client.startSession(authResponse('access-login'));

    await expect(refreshing).resolves.toBeNull();
    expect(client.getAccessToken()).toBe('access-login');
  });
});
