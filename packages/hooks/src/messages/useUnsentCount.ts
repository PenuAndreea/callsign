import { useSyncExternalStore } from 'react';

import { useRealtime } from '../realtime/RealtimeContext';

/** How many messages this device has not got saved yet (queued, sending or failed), all nets. */
export function useUnsentCount(): number {
  const { pending } = useRealtime();
  return useSyncExternalStore(pending.subscribe, () => pending.all().length);
}
