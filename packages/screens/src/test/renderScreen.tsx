import { ApiProvider } from '@callsign/hooks';
import {
  api,
  apiError,
  authResponse,
  createTestClients,
  server,
  webPlatform,
} from '@callsign/hooks/testing';
import { ThemeProvider } from '@callsign/ui';
import { render } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactElement } from 'react';

export interface RenderScreenOptions {
  /** What `/auth/refresh` answers when the provider restores on mount. Default `signedOut`. */
  session?: 'signedOut' | 'signedIn';
}

/** Renders a screen with the theme and a fresh API provider, as the apps do. */
export function renderScreen(
  ui: ReactElement,
  { session = 'signedOut' }: RenderScreenOptions = {},
) {
  server.use(
    http.post(api('/auth/refresh'), () =>
      session === 'signedIn'
        ? HttpResponse.json(authResponse('access-1'))
        : apiError(401, 'UNAUTHORIZED'),
    ),
  );
  const clients = createTestClients();
  const result = render(
    <ThemeProvider>
      <ApiProvider platform={webPlatform} {...clients}>
        {ui}
      </ApiProvider>
    </ThemeProvider>,
  );
  return { ...result, ...clients };
}
