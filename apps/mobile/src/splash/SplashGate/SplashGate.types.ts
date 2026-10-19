import type { ReactNode } from 'react';

export interface SplashGateProps {
  /** The app knows where to go (the session is restored, or known to be unreachable). */
  ready: boolean;
  /** The app, rendered under the splash from the start so it can load meanwhile. */
  children: ReactNode;
}
