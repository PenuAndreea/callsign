import { createContext, use } from 'react';

import type { Realtime } from './createRealtime';

export const RealtimeContext = createContext<Realtime | null>(null);

/** The realtime layer of `ApiProvider` (for the realtime hooks). */
export function useRealtime(): Realtime {
  const realtime = use(RealtimeContext);
  if (realtime === null) throw new Error('Realtime hooks must be used inside <ApiProvider>');
  return realtime;
}
