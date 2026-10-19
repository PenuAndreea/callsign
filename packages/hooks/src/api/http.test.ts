import { userDtoSchema } from '@callsign/types';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { apiError, wolf } from '../test/fixtures';
import { api, API_URL, server } from '../test/server';
import { ApiClientError } from './ApiClientError';
import type { HttpConfig } from './http';
import { buildUrl, parseResponse, sendHttp } from './http';

const config: HttpConfig = {
  apiUrl: API_URL,
  client: 'web',
  fetch: (input, init) => globalThis.fetch(input, init),
};

describe('buildUrl', () => {
  it('adds the /api prefix and skips undefined query values', () => {
    expect(buildUrl(API_URL, '/rooms', { scope: 'open', cursor: undefined, limit: 20 })).toBe(
      `${API_URL}/api/rooms?scope=open&limit=20`,
    );
  });

  it('leaves out the question mark without a query', () => {
    expect(buildUrl('', '/auth/me')).toBe('/api/auth/me');
  });
});

describe('sendHttp', () => {
  it('sends the client type, the bearer token and a JSON body', async () => {
    let seen: Request | undefined;
    server.use(
      http.post(api('/rooms'), ({ request }) => {
        seen = request.clone();
        return HttpResponse.json({ ok: true }, { status: 201 });
      }),
    );

    const response = await sendHttp(
      config,
      { method: 'POST', path: '/rooms', body: { name: 'tower' } },
      'access-1',
    );

    expect(response).toEqual({ status: 201, body: { ok: true } });
    expect(seen?.headers.get('x-client')).toBe('web');
    expect(seen?.headers.get('authorization')).toBe('Bearer access-1');
    expect(seen?.headers.get('content-type')).toBe('application/json');
    await expect(seen?.json()).resolves.toEqual({ name: 'tower' });
  });

  it('sends no Authorization header without a token and no body for a GET', async () => {
    let seen: Request | undefined;
    server.use(
      http.get(api('/auth/me'), ({ request }) => {
        seen = request;
        return HttpResponse.json(wolf);
      }),
    );

    await sendHttp(config, { method: 'GET', path: '/auth/me' }, null);
    expect(seen?.headers.has('authorization')).toBe(false);
    expect(seen?.headers.has('content-type')).toBe(false);
  });

  it('returns no body for a 204', async () => {
    server.use(
      http.delete(api('/rooms/1/members/me'), () => new HttpResponse(null, { status: 204 })),
    );
    await expect(
      sendHttp(config, { method: 'DELETE', path: '/rooms/1/members/me' }, null),
    ).resolves.toEqual({ status: 204, body: undefined });
  });

  it('rejects with the API error code', async () => {
    server.use(http.post(api('/rooms'), () => apiError(409, 'NET_NAME_TAKEN')));
    const sent = sendHttp(config, { method: 'POST', path: '/rooms', body: {} }, null);
    await expect(sent).rejects.toMatchObject({ status: 409, code: 'NET_NAME_TAKEN' });
    await expect(sent).rejects.toBeInstanceOf(ApiClientError);
  });

  it('keeps the status when the error body is not an ApiError', async () => {
    server.use(http.get(api('/rooms'), () => new HttpResponse('Bad gateway', { status: 502 })));
    await expect(sendHttp(config, { method: 'GET', path: '/rooms' }, null)).rejects.toMatchObject({
      status: 502,
      code: 'INTERNAL_ERROR',
    });
  });

  it('turns a failed fetch into NETWORK_ERROR', async () => {
    server.use(http.get(api('/rooms'), () => HttpResponse.error()));
    await expect(sendHttp(config, { method: 'GET', path: '/rooms' }, null)).rejects.toMatchObject({
      status: 0,
      code: 'NETWORK_ERROR',
    });
  });
});

describe('parseResponse', () => {
  it('returns the parsed body', () => {
    expect(parseResponse(userDtoSchema, { status: 200, body: wolf })).toEqual(wolf);
  });

  it('rejects a body that does not match the shared schema', () => {
    expect(() => parseResponse(userDtoSchema, { status: 200, body: { id: 1 } })).toThrow(
      expect.objectContaining({ code: 'INVALID_RESPONSE', status: 200 }),
    );
  });
});
