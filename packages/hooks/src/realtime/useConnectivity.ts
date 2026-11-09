import { onlineManager } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';

import type { RealtimeStatus } from './realtime.types';
import { useRealtimeStatus } from './useRealtimeStatus';

/**
 * How this device reaches the net right now:
 * - `offline`: no network at all (the browser's events on the web, NetInfo on mobile). Queries
 *   and mutations pause; only what is saved on the device shows.
 * - `noSignal`: a network, but no live socket (the API is down or unreachable, or the socket is
 *   still connecting). Requests may still fail.
 * - `connected`: live.
 */
export type Connectivity = 'offline' | 'noSignal' | 'connected';

export function connectivityOf(online: boolean, realtime: RealtimeStatus): Connectivity {
  if (!online) return 'offline';
  return realtime === 'connected' ? 'connected' : 'noSignal';
}

const subscribeOnline = (listener: () => void) => onlineManager.subscribe(listener);
const isOnline = () => onlineManager.isOnline();

/** The device's network and the socket together, for offline cues on screen. */
export function useConnectivity(): Connectivity {
  const online = useSyncExternalStore(subscribeOnline, isOnline);
  return connectivityOf(online, useRealtimeStatus());
}
