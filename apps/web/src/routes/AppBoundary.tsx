import { ScreenErrorBoundary } from '@callsign/screens';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router';

/**
 * The last boundary inside the router: React Router's data router catches route crashes itself
 * (its "Unexpected Application Error" page), so ours sits in the root route's element. Moving to
 * another page (back, a link) starts over.
 */
export function AppBoundary({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return <ScreenErrorBoundary resetKeys={[pathname]}>{children}</ScreenErrorBoundary>;
}
