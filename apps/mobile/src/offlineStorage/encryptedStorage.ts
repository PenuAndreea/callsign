import type { OfflineStorage } from '@callsign/hooks';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getRandomBytes } from 'expo-crypto';

import type { Cipher } from './cipher';
import { createCipher } from './cipher';
import type { EncryptionKeyStore } from './encryptionKey';
import { createEncryptionKeyStore } from './encryptionKey';

/** Only these keys are ours: `clear()` never touches what another library saved. */
export const KEY_PREFIX = 'callsign.offline.';

/** The part of AsyncStorage this needs (an in-memory one in tests). */
export type BackingStorage = Pick<
  typeof AsyncStorage,
  'getItem' | 'setItem' | 'removeItem' | 'getAllKeys' | 'multiRemove'
>;

interface EncryptedStorageOptions {
  backing?: BackingStorage;
  keys?: EncryptionKeyStore;
  randomBytes?: (count: number) => Uint8Array;
}

/**
 * Offline data in AsyncStorage, every value encrypted (AES-256-GCM) with a key from the secure
 * store (`docs/security.md`, M9). AsyncStorage files are plain on disk and can end up in a
 * backup; the key cannot.
 * - A value that does not decrypt (its key was deleted, or it was restored from a backup without
 *   the keychain) reads as missing and is removed: the app refetches it.
 * - `clear()` removes the values and deletes the key, so a value written during the wipe can
 *   never be read either.
 */
export function createEncryptedStorage({
  backing = AsyncStorage,
  keys = createEncryptionKeyStore(),
  randomBytes = getRandomBytes,
}: EncryptedStorageOptions = {}): OfflineStorage {
  const cipher = async (): Promise<Cipher> => createCipher(await keys.get(), randomBytes);

  return {
    async getItem(key) {
      const payload = await backing.getItem(KEY_PREFIX + key);
      if (payload === null) return null;
      const { decrypt } = await cipher();
      try {
        return decrypt(payload, key);
      } catch {
        await backing.removeItem(KEY_PREFIX + key);
        return null;
      }
    },
    async setItem(key, value) {
      const { encrypt } = await cipher();
      await backing.setItem(KEY_PREFIX + key, encrypt(value, key));
    },
    removeItem: (key) => backing.removeItem(KEY_PREFIX + key),
    async clear() {
      const ours = (await backing.getAllKeys()).filter((key) => key.startsWith(KEY_PREFIX));
      await backing.multiRemove(ours);
      await keys.forget();
    },
  };
}
