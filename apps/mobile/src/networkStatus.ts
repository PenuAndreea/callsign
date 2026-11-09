import { onlineManager } from '@callsign/hooks';
import type { NetInfoState } from '@react-native-community/netinfo';
import NetInfo from '@react-native-community/netinfo';

/**
 * Online unless NetInfo knows the device has no network. `null` (not known yet, common right at
 * start-up) counts as online, so queries never pause on a guess. `isInternetReachable` is not
 * used: it probes an outside URL, so it can say "offline" while the API (a dev server on the
 * LAN, or a private network) answers.
 */
export function isOnline(state: Pick<NetInfoState, 'isConnected'>): boolean {
  return state.isConnected !== false;
}

/**
 * React Native has no `online` / `offline` events, so TanStack Query's `onlineManager` would
 * assume the phone is always online and keep failing fetches with `NETWORK_ERROR`. With NetInfo
 * as its source, queries pause while offline (cached data stays on screen) and resume on their
 * own when the network returns. The web needs nothing: TanStack listens to the browser's events.
 */
export function connectNetworkStatus(): void {
  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) => setOnline(isOnline(state))),
  );
}
