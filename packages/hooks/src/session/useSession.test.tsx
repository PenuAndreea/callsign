// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';

import { apiError, authResponse, wolf } from '../test/fixtures';
import { renderHookWithApiProvider } from '../test/renderHookWithApiProvider';
import { api, server } from '../test/server';
import { useLogin, useLogout, useRegister } from './useAuthMutations';
import { useSession, useSignedInUser } from './useSession';

afterEach(cleanup);

const signedOutOnStart = () =>
  server.use(http.post(api('/auth/refresh'), () => apiError(401, 'UNAUTHORIZED')));

describe('useSession', () => {
  it('restores the session on mount', async () => {
    server.use(http.post(api('/auth/refresh'), () => HttpResponse.json(authResponse('access-1'))));
    const { result } = renderHookWithApiProvider(() => useSession());

    expect(result.current.session.status).toBe('restoring');
    await waitFor(() => expect(result.current.session).toEqual({ status: 'signedIn', user: wolf }));
  });

  it('is signed out without a valid refresh token', async () => {
    signedOutOnStart();
    const { result } = renderHookWithApiProvider(() => useSession());
    await waitFor(() => expect(result.current.session.status).toBe('signedOut'));
  });

  it('retries a restore that could not reach the API', async () => {
    server.use(http.post(api('/auth/refresh'), () => HttpResponse.error()));
    const { result } = renderHookWithApiProvider(() => useSession());
    await waitFor(() => expect(result.current.session.status).toBe('unreachable'));

    server.use(http.post(api('/auth/refresh'), () => HttpResponse.json(authResponse('access-1'))));
    await act(() => result.current.retryRestore());
    expect(result.current.session.status).toBe('signedIn');
  });
});

describe('useSignedInUser', () => {
  it('throws when nobody is signed in', () => {
    signedOutOnStart();
    expect(() => renderHookWithApiProvider(() => useSignedInUser())).toThrow(/signed-in session/);
  });

  it('throws outside the provider', () => {
    expect(() => renderHook(() => useSignedInUser())).toThrow(/inside <ApiProvider>/);
  });
});

describe('useLogin', () => {
  it('signs in with the credentials and returns the user', async () => {
    signedOutOnStart();
    let body: unknown;
    server.use(
      http.post(api('/auth/login'), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(authResponse('access-1'));
      }),
    );
    const { result, apiClient } = renderHookWithApiProvider(() => ({
      login: useLogin(),
      session: useSession().session,
    }));
    await waitFor(() => expect(result.current.session.status).toBe('signedOut'));

    const credentials = { callsign: 'wolf-2', passphrase: 'correct horse' };
    await act(() => result.current.login.mutateAsync(credentials));

    expect(body).toEqual(credentials);
    expect(result.current.session).toEqual({ status: 'signedIn', user: wolf });
    expect(apiClient.getAccessToken()).toBe('access-1');
  });

  it('reports wrong credentials and stays signed out', async () => {
    signedOutOnStart();
    server.use(http.post(api('/auth/login'), () => apiError(401, 'INVALID_CREDENTIALS')));
    const { result } = renderHookWithApiProvider(() => ({
      login: useLogin(),
      session: useSession().session,
    }));

    act(() => result.current.login.mutate({ callsign: 'wolf-2', passphrase: 'wrong' }));
    await waitFor(() =>
      expect(result.current.login.error).toMatchObject({ code: 'INVALID_CREDENTIALS' }),
    );
    expect(result.current.session.status).toBe('signedOut');
  });
});

describe('useRegister', () => {
  it('signs in a new station', async () => {
    signedOutOnStart();
    server.use(
      http.post(api('/auth/register'), () =>
        HttpResponse.json(authResponse('access-1'), { status: 201 }),
      ),
    );
    const { result } = renderHookWithApiProvider(() => ({
      register: useRegister(),
      session: useSession().session,
    }));

    await act(() =>
      result.current.register.mutateAsync({ callsign: 'wolf-2', passphrase: 'correct horse' }),
    );
    expect(result.current.session.status).toBe('signedIn');
  });

  it('reports a taken callsign', async () => {
    signedOutOnStart();
    server.use(http.post(api('/auth/register'), () => apiError(409, 'CALLSIGN_TAKEN')));
    const { result } = renderHookWithApiProvider(() => useRegister());

    act(() => result.current.mutate({ callsign: 'wolf-2', passphrase: 'correct horse' }));
    await waitFor(() => expect(result.current.error).toMatchObject({ code: 'CALLSIGN_TAKEN' }));
  });
});

describe('useLogout', () => {
  it('signs out and empties the cache', async () => {
    server.use(
      http.post(api('/auth/refresh'), () => HttpResponse.json(authResponse('access-1'))),
      http.post(api('/auth/logout'), () => new HttpResponse(null, { status: 204 })),
    );
    const { result, queryClient } = renderHookWithApiProvider(() => ({
      logout: useLogout(),
      session: useSession().session,
    }));
    await waitFor(() => expect(result.current.session.status).toBe('signedIn'));
    queryClient.setQueryData(['nets'], ['tower']);

    await act(() => result.current.logout.mutateAsync());
    expect(result.current.session.status).toBe('signedOut');
    expect(queryClient.getQueryData(['nets'])).toBeUndefined();
  });
});
