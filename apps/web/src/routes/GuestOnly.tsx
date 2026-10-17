import { useSession } from '@callsign/hooks';
import { Navigate, Outlet, useLocation } from 'react-router';

import { redirectTarget } from './redirectTarget';

/** Sign in and register. Once signed in (the forms just succeeded) → the page asked for, or home. */
export function GuestOnly() {
  const { session } = useSession();
  const location = useLocation();

  if (session.status === 'signedIn') {
    return <Navigate to={redirectTarget(location.state)} replace />;
  }
  return <Outlet />;
}
