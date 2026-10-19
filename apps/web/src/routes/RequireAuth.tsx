import { useSession } from '@callsign/hooks';
import { Navigate, Outlet, useLocation } from 'react-router';

import { fromState } from './redirectTarget';

/** Signed-in routes. Signed out (also after a logout or an ended session) → sign in, then back here. */
export function RequireAuth() {
  const { session } = useSession();
  const location = useLocation();

  if (session.status !== 'signedIn') {
    return <Navigate to="/signin" replace state={fromState(location.pathname + location.search)} />;
  }
  return <Outlet />;
}
