// Web Crypto random bytes (Node in tests); the app passes expo-crypto's.
import { randomBytes } from '@noble/ciphers/utils.js';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { EncryptionKeyStore } from '@/offlineStorage/encryptionKey';
import { createEncryptedStorage, KEY_PREFIX } from '@/offlineStorage/encryptedStorage';

/** A key store in memory: `forget` drops the key, the next `get` makes a new one. */
function memoryKeys(): EncryptionKeyStore {
  let key: Uint8Array | null = null;
  return {
    get: () => Promise.resolve((key ??= randomBytes(32))),
    forget: () => {
      key = null;
      return Promise.resolve();
    },
  };
}

function setup() {
  const storage = createEncryptedStorage({
    backing: AsyncStorage,
    keys: memoryKeys(),
    randomBytes,
  });
  return { storage };
}

beforeEach(() => AsyncStorage.clear());

describe('createEncryptedStorage', () => {
  it('saves values encrypted under its own prefix and reads them back', async () => {
    const { storage } = setup();
    await storage.setItem('cache', 'Traffic in sight, Eagle One.');

    const onDisk = await AsyncStorage.getItem(`${KEY_PREFIX}cache`);
    expect(onDisk).not.toBeNull();
    expect(onDisk).not.toContain('Traffic');
    expect(await storage.getItem('cache')).toBe('Traffic in sight, Eagle One.');
  });

  it('reads a missing value as null', async () => {
    expect(await setup().storage.getItem('cache')).toBeNull();
  });

  it('removes a value', async () => {
    const { storage } = setup();
    await storage.setItem('cache', 'tower');
    await storage.removeItem('cache');
    expect(await AsyncStorage.getItem(`${KEY_PREFIX}cache`)).toBeNull();
  });

  it('reads a value it cannot decrypt as missing, and removes it', async () => {
    const { storage } = setup();
    await AsyncStorage.setItem(`${KEY_PREFIX}cache`, 'ab'.repeat(40));

    expect(await storage.getItem('cache')).toBeNull();
    expect(await AsyncStorage.getItem(`${KEY_PREFIX}cache`)).toBeNull();
  });

  it('lists only its own keys, without the prefix', async () => {
    const { storage } = setup();
    await AsyncStorage.setItem('other-library', 'not ours');
    await storage.setItem('cache', 'tower');
    await storage.setItem('outbox:1', 'Over.');

    expect((await storage.keys()).sort()).toEqual(['cache', 'outbox:1']);
  });

  it('clears only its own values and forgets the key', async () => {
    const { storage } = setup();
    await AsyncStorage.setItem('other-library', 'kept');
    await storage.setItem('cache', 'tower');
    const written = await AsyncStorage.getItem(`${KEY_PREFIX}cache`);

    await storage.clear();
    expect(await AsyncStorage.getAllKeys()).toEqual(['other-library']);

    // Written with the forgotten key (a write racing the wipe): never readable again.
    await AsyncStorage.setItem(`${KEY_PREFIX}cache`, written ?? '');
    expect(await storage.getItem('cache')).toBeNull();
  });
});
