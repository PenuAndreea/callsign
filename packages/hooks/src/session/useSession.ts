import type { UserDto } from '@callsign/types';
import { useSyncExternalStore } from 'react';

import { useSessionStore } from './SessionContext';
import type { SessionState } from './sessionStore';

export interface UseSessionResult {
  session: SessionState;
  /** Tries again after `unreachable`. */
  retryRestore: () => Promise<void>;
}

/** The current session; re-renders only when it changes (not on token refreshes). */
export function useSession(): UseSessionResult {
  const store = useSessionStore();
  const session = useSyncExternalStore(store.subscribe, store.getSnapshot);
  return { session, retryRestore: store.restore };
}

/** The signed-in user, for screens behind the auth guard. Throws if nobody is signed in. */
export function useSignedInUser(): UserDto {
  const { session } = useSession();
  if (session.status !== 'signedIn') throw new Error('useSignedInUser needs a signed-in session');
  return session.user;
}
