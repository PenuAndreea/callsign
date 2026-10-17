import { createContext, use } from 'react';

import type { SessionStore } from './sessionStore';

export const SessionContext = createContext<SessionStore | null>(null);

/** The session store of `ApiProvider` (for the session hooks; screens use `useSession`). */
export function useSessionStore(): SessionStore {
  const store = use(SessionContext);
  if (store === null) throw new Error('Session hooks must be used inside <ApiProvider>');
  return store;
}
