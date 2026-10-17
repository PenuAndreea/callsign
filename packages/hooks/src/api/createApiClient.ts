import type { AuthResponse } from '@callsign/types';
import { authResponseSchema } from '@callsign/types';
import type { z } from 'zod';

import type { CallsignPlatform } from '../platform/platform.types';
import { ApiClientError, isApiClientError } from './ApiClientError';
import type { ApiRequest, HttpConfig, HttpResponse } from './http';
import { parseResponse, sendHttp } from './http';

export interface ApiClient {
  /** A call whose response is parsed with `schema` (the shared Zod schema of the DTO). */
  request<T>(request: ApiRequest, schema: z.ZodType<T>): Promise<T>;
  /** A call that answers 204 (join is not one: it returns the net). */
  requestNoContent(request: ApiRequest): Promise<void>;
  /** Keeps the tokens of a login, register or refresh response. */
  startSession(auth: AuthResponse): Promise<void>;
  /** Forgets this device's tokens. Logout calls the API first. */
  endSession(): Promise<void>;
  /**
   * New tokens from `/auth/refresh`. Concurrent callers share one request: rotation replaces the
   * refresh token, so a second request with the old one would be taken for a stolen token and
   * end the session. Resolves `null` when the session is over (401); rejects on other failures
   * (offline, 5xx, rate limit), which must not sign anyone out.
   */
  refresh(): Promise<AuthResponse | null>;
  getAccessToken(): string | null;
  /** Called when a refresh finds the session over: expired, revoked, or never started. */
  onSessionEnd(listener: () => void): () => void;
}

export interface ApiClientOptions {
  /** For tests; defaults to the global `fetch` (looked up per call, so MSW can patch it). */
  fetch?: typeof fetch;
}

const REFRESH_LOCK = 'callsign:auth-refresh';

/**
 * The one HTTP client of an app. The access token lives here, in memory only: never in React
 * state (no re-render per refresh) and never in storage. Requests send it as a Bearer token;
 * a 401 refreshes once and retries the request once.
 */
export function createApiClient(
  platform: CallsignPlatform,
  options: ApiClientOptions = {},
): ApiClient {
  const config: HttpConfig = {
    apiUrl: platform.apiUrl,
    client: platform.client,
    fetch: options.fetch ?? ((input, init) => globalThis.fetch(input, init)),
  };
  const sessionEndListeners = new Set<() => void>();
  let accessToken: string | null = null;
  let refreshing: Promise<AuthResponse | null> | null = null;

  async function startSession(auth: AuthResponse): Promise<void> {
    if (platform.client === 'mobile') {
      if (auth.refreshToken === undefined) {
        throw new ApiClientError(200, 'INVALID_RESPONSE', 'No refresh token for a mobile client');
      }
      await platform.refreshTokenStore.write(auth.refreshToken);
    }
    accessToken = auth.accessToken;
  }

  async function endSession(): Promise<void> {
    accessToken = null;
    if (platform.client === 'mobile') await platform.refreshTokenStore.clear();
  }

  async function sessionOver(): Promise<null> {
    await endSession();
    for (const listener of sessionEndListeners) listener();
    return null;
  }

  /** Web: `{}` (the cookie carries the token). Mobile: the stored token, `null` if there is none. */
  async function refreshBody(): Promise<{ refreshToken?: string } | null> {
    if (platform.client === 'web') return {};
    const refreshToken = await platform.refreshTokenStore.read();
    return refreshToken === null ? null : { refreshToken };
  }

  async function runRefresh(): Promise<AuthResponse | null> {
    const body = await refreshBody();
    if (body === null) return sessionOver();
    try {
      const response = await sendHttp(
        config,
        { method: 'POST', path: '/auth/refresh', body, auth: false },
        null,
      );
      const auth = parseResponse(authResponseSchema, response);
      await startSession(auth);
      return auth;
    } catch (error) {
      if (isApiClientError(error, 'UNAUTHORIZED')) return sessionOver();
      throw error;
    }
  }

  function refresh(): Promise<AuthResponse | null> {
    const run = () =>
      platform.runExclusive ? platform.runExclusive(REFRESH_LOCK, runRefresh) : runRefresh();
    refreshing ??= run().finally(() => {
      refreshing = null;
    });
    return refreshing;
  }

  async function send(request: ApiRequest): Promise<HttpResponse> {
    if (request.auth === false) return sendHttp(config, request, null);
    const sentWith = accessToken;
    try {
      return await sendHttp(config, request, sentWith);
    } catch (error) {
      if (!isApiClientError(error, 'UNAUTHORIZED')) throw error;
      // Another call may have refreshed while this one was in flight: reuse its token.
      const fresh =
        accessToken !== null && accessToken !== sentWith
          ? accessToken
          : ((await refresh())?.accessToken ?? null);
      if (fresh === null) throw error;
      return sendHttp(config, request, fresh);
    }
  }

  return {
    async request(request, schema) {
      return parseResponse(schema, await send(request));
    },
    async requestNoContent(request) {
      await send(request);
    },
    startSession,
    endSession,
    refresh,
    getAccessToken: () => accessToken,
    onSessionEnd(listener) {
      sessionEndListeners.add(listener);
      return () => sessionEndListeners.delete(listener);
    },
  };
}
