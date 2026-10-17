import { useSyncExternalStore } from 'react';

import type { RealtimeStatus } from './realtime.types';
import { useRealtime } from './RealtimeContext';

/** Whether live events arrive right now (e.g. to show "reconnecting" or hold the composer). */
export function useRealtimeStatus(): RealtimeStatus {
  const realtime = useRealtime();
  return useSyncExternalStore(realtime.subscribe, realtime.getStatus);
}
