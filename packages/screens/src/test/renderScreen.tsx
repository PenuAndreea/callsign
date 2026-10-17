import type { ApiPlatform } from '@callsign/hooks';
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
import { SafeAreaProvider } from 'react-native-safe-area-context';

/** No notch in tests: zero insets, a phone-sized frame, available on the first render. */
const TEST_METRICS = {
  frame: { x: 0, y: 0, width: 375, height: 812 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

export interface RenderScreenOptions {
  /** What `/auth/refresh` answers when the provider restores on mount. Default `signedOut`. */
  session?: 'signedOut' | 'signedIn';
  /** Default: the web fixture with realtime off. Pass a socket test server's factory to go live. */
  platform?: ApiPlatform;
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
  { session = 'signedOut', platform = webPlatform }: RenderScreenOptions = {},
) {
  server.use(
    http.post(api('/auth/refresh'), () =>
      session === 'signedIn'
        ? HttpResponse.json(authResponse('access-1'))
        : apiError(401, 'UNAUTHORIZED'),
    ),
  );
  const clients = createTestClients(platform);
  const result = render(
    <SafeAreaProvider initialMetrics={TEST_METRICS}>
      <ThemeProvider>
        <ApiProvider platform={platform} {...clients}>
          {session === 'signedIn' ? <SignedInOnly>{ui}</SignedInOnly> : ui}
        </ApiProvider>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
  return { ...result, ...clients };
}
