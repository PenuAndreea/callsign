import { useSession } from '@callsign/hooks';
import { RestoringScreen, UnreachableScreen } from '@callsign/screens';
import { Outlet } from 'react-router';

/** Holds every route until the session is known: blank while restoring, retry when unreachable. */
export function SessionGate() {
  const { session, retryRestore } = useSession();

  if (session.status === 'restoring') return <RestoringScreen />;
  if (session.status === 'unreachable') {
    return <UnreachableScreen onRetry={() => void retryRestore()} />;
  }
  return <Outlet />;
}
