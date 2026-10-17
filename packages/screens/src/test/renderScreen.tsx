import { ApiProvider, useSession } from '@callsign/hooks';
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
import type { ReactElement, ReactNode } from 'react';

export interface RenderScreenOptions {
  /** What `/auth/refresh` answers when the provider restores on mount. Default `signedOut`. */
  session?: 'signedOut' | 'signedIn';
}

/** Like the apps' guards: signed-in screens render only once the restore signed in. */
function SignedInOnly({ children }: { children: ReactNode }) {
  const { session } = useSession();
  return session.status === 'signedIn' ? children : null;
}

/**
 * Renders a screen with the theme and a fresh API provider, as the apps do. With
 * `session: 'signedIn'` the screen appears after the restore: use `findBy…` queries.
 */
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
        {session === 'signedIn' ? <SignedInOnly>{ui}</SignedInOnly> : ui}
      </ApiProvider>
    </ThemeProvider>,
  );
  return { ...result, ...clients };
}
