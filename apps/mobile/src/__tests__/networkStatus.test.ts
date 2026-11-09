import { onlineManager } from '@callsign/hooks';
import type { NetInfoChangeHandler, NetInfoState } from '@react-native-community/netinfo';
import NetInfo from '@react-native-community/netinfo';

import { connectNetworkStatus, isOnline } from '@/networkStatus';

describe('isOnline', () => {
  it('is offline only when NetInfo knows there is no network', () => {
    expect(isOnline({ isConnected: false })).toBe(false);
    expect(isOnline({ isConnected: true })).toBe(true);
  });

  it('counts an unknown state (start-up) as online', () => {
    expect(isOnline({ isConnected: null })).toBe(true);
  });
});

describe('connectNetworkStatus', () => {
  afterEach(() => onlineManager.setOnline(true));

  it('pauses TanStack Query while offline and resumes when the network returns', () => {
    let onChange: NetInfoChangeHandler = () => undefined;
    const unsubscribe = jest.fn();
    jest.mocked(NetInfo.addEventListener).mockImplementation((listener) => {
      onChange = listener;
      return unsubscribe;
    });

    connectNetworkStatus();
    onChange({ isConnected: false } as NetInfoState);
    expect(onlineManager.isOnline()).toBe(false);
    onChange({ isConnected: true } as NetInfoState);
    expect(onlineManager.isOnline()).toBe(true);

    // A new source replaces this one and unsubscribes it.
    onlineManager.setEventListener(() => undefined);
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
