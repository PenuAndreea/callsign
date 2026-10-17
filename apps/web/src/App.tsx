import type { ApiPlatform } from '@callsign/hooks';
import { ApiProvider } from '@callsign/hooks';
import { ThemeProvider } from '@callsign/ui';
import type { DataRouter } from 'react-router';
import { RouterProvider } from 'react-router';

export interface AppProps {
  platform: ApiPlatform;
  /** Browser router in `main.tsx`; a memory router in tests. */
  router: DataRouter;
}

function App({ platform, router }: AppProps) {
  return (
    <ThemeProvider>
      <ApiProvider platform={platform}>
        <RouterProvider router={router} />
      </ApiProvider>
    </ThemeProvider>
  );
}

export default App;
