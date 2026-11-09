import { bytesToHex, hexToBytes } from '@noble/ciphers/utils.js';
import { getRandomBytes } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

import { SECURE_STORE_OPTIONS } from '@/secureStoreOptions';

const KEY_NAME = 'callsign.offlineKey';
/** AES-256. */
const KEY_BYTES = 32;

export interface EncryptionKeyStore {
  /** The key, made and saved on first use. Concurrent callers share one read (never two keys). */
  get(): Promise<Uint8Array>;
  /** Deletes the key: whatever was encrypted with it can never be read again. */
  forget(): Promise<void>;
}

/**
 * The offline storage key lives in the keychain (iOS) / keystore (Android), with the same
 * device-only accessibility as the refresh token, never next to the data it encrypts. Random
 * bytes come from the OS (`expo-crypto`), not `Math.random`.
 */
export function createEncryptionKeyStore(): EncryptionKeyStore {
  let key: Promise<Uint8Array> | null = null;

  async function readOrCreate(): Promise<Uint8Array> {
    const saved = await SecureStore.getItemAsync(KEY_NAME, SECURE_STORE_OPTIONS);
    if (saved !== null) return hexToBytes(saved);
    const created = getRandomBytes(KEY_BYTES);
    await SecureStore.setItemAsync(KEY_NAME, bytesToHex(created), SECURE_STORE_OPTIONS);
    return created;
  }

  return {
    get() {
      // A failed read is not cached: the next call tries again.
      key ??= readOrCreate().catch((error: unknown) => {
        key = null;
        throw error;
      });
      return key;
    },
    async forget() {
      key = null;
      await SecureStore.deleteItemAsync(KEY_NAME, SECURE_STORE_OPTIONS);
    },
  };
}
