import {
  api,
  apiError,
  authResponse,
  net,
  page,
  server,
  webPlatform,
} from '@callsign/hooks/testing';
import { render } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { createMemoryRouter } from 'react-router';
import { afterEach, beforeEach } from 'vitest';

import App from '../App';
import { routes } from '../routes';

/** What `/auth/refresh` answers when the app restores its session on start. */
export const refreshAnswers = (session: 'signedIn' | 'signedOut' | 'offline') =>
  server.use(
    http.post(api('/auth/refresh'), () => {
      if (session === 'offline') return HttpResponse.error();
      return session === 'signedIn'
        ? HttpResponse.json(authResponse('access-1'))
        : apiError(401, 'UNAUTHORIZED');
    }),
  );

export const tower = net('tower', { memberCount: 2 });

/**
 * Call once per test file: signed-in pages load the nets list (tower is joined, nothing is
 * open, one message in tower), and windows start wide (split view).
 */
export function setupAppTests() {
  beforeEach(() => {
    server.use(
      http.get(api('/rooms'), ({ request }) =>
        HttpResponse.json(
          page(new URL(request.url).searchParams.get('scope') === 'joined' ? [tower] : []),
        ),
      ),
      http.get(api(`/rooms/${tower.id}`), () => HttpResponse.json(tower)),
      http.get(api(`/rooms/${tower.id}/messages`), () =>
        HttpResponse.json(
          page([
            {
              id: 'aa00000000000000000000aa',
              roomId: tower.id,
              sender: { id: 'other', callsign: 'twr-ops' },
              content: 'Radio check. Over.',
              createdAt: '2026-10-17T22:14:00.000Z',
            },
          ]),
        ),
      ),
    );
  });
  beforeEach(() => setWindowWidth(1024));
  afterEach(() => setWindowWidth(0));
}

/**
 * react-native-web measures `documentElement.clientWidth` (jsdom has no layout: always 0) and
 * re-reads it on `resize`. Tests start wide (split view) unless they narrow the window.
 */
export function setWindowWidth(width: number) {
  Object.defineProperty(document.documentElement, 'clientWidth', {
    configurable: true,
    value: width,
  });
  window.dispatchEvent(new Event('resize'));
}

/** The real routes in a memory router, against MSW (the test platform has an absolute API URL). */
export function renderApp(path = '/') {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<App platform={webPlatform} router={router} />);
  return router;
}
