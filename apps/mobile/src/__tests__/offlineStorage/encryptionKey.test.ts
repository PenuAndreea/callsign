import * as SecureStore from 'expo-secure-store';

import { createEncryptionKeyStore } from '@/offlineStorage/encryptionKey';
import { SECURE_STORE_OPTIONS } from '@/secureStoreOptions';

const mockSaved = new Map<string, string>();

jest.mock('expo-secure-store', () => ({
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'after-first-unlock-this-device-only',
  getItemAsync: jest.fn((name: string) => Promise.resolve(mockSaved.get(name) ?? null)),
  setItemAsync: jest.fn((name: string, value: string) => {
    mockSaved.set(name, value);
    return Promise.resolve();
  }),
  deleteItemAsync: jest.fn((name: string) => {
    mockSaved.delete(name);
    return Promise.resolve();
  }),
}));

let mockNextByte = 1;
jest.mock('expo-crypto', () => ({
  getRandomBytes: jest.fn((count: number) => new Uint8Array(count).fill(mockNextByte++)),
}));

beforeEach(() => {
  mockSaved.clear();
  jest.clearAllMocks();
});

describe('createEncryptionKeyStore', () => {
  it('makes a 256-bit key once and keeps it in the secure store, device-only', async () => {
    const keys = createEncryptionKeyStore();
    const [first, second] = await Promise.all([keys.get(), keys.get()]);

    expect(first).toHaveLength(32);
    expect(second).toBe(first);
    expect(SecureStore.setItemAsync).toHaveBeenCalledTimes(1);
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      'callsign.offlineKey',
      expect.stringMatching(/^[0-9a-f]{64}$/),
      SECURE_STORE_OPTIONS,
    );
  });

  it('reads the saved key after a restart', async () => {
    const before = await createEncryptionKeyStore().get();
    const after = await createEncryptionKeyStore().get();
    expect(after).toEqual(before);
  });

  it('makes a new key after forgetting the old one', async () => {
    const keys = createEncryptionKeyStore();
    const old = await keys.get();

    await keys.forget();
    expect(mockSaved.has('callsign.offlineKey')).toBe(false);
    expect(await keys.get()).not.toEqual(old);
  });

  it('tries the secure store again after a failed read', async () => {
    jest.mocked(SecureStore.getItemAsync).mockRejectedValueOnce(new Error('locked'));
    const keys = createEncryptionKeyStore();

    await expect(keys.get()).rejects.toThrow('locked');
    await expect(keys.get()).resolves.toHaveLength(32);
  });
});
