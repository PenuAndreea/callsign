import * as SecureStore from 'expo-secure-store';

import { markIntroSeen, readIntroSeen } from '@/splash/introSeen';

jest.mock('expo-secure-store', () => ({ getItemAsync: jest.fn(), setItemAsync: jest.fn() }));

describe('introSeen', () => {
  it('reads the stored flag', async () => {
    jest.mocked(SecureStore.getItemAsync).mockResolvedValueOnce('true');
    await expect(readIntroSeen()).resolves.toBe(true);
    jest.mocked(SecureStore.getItemAsync).mockResolvedValueOnce(null);
    await expect(readIntroSeen()).resolves.toBe(false);
  });

  it('counts a failed read as seen, so the full intro does not play on every launch', async () => {
    jest.mocked(SecureStore.getItemAsync).mockRejectedValueOnce(new Error('keychain'));
    await expect(readIntroSeen()).resolves.toBe(true);
  });

  it('stores the flag, and shrugs off a failed write', async () => {
    jest.mocked(SecureStore.setItemAsync).mockResolvedValueOnce();
    await markIntroSeen();
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('callsign.introSeen', 'true');

    jest.mocked(SecureStore.setItemAsync).mockRejectedValueOnce(new Error('keychain'));
    await expect(markIntroSeen()).resolves.toBeUndefined();
  });
});
