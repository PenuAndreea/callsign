import * as SecureStore from 'expo-secure-store';

/**
 * iOS: readable after the first unlock since boot (so a background refresh still works), and
 * never in iCloud/iTunes backups or moved to another device. Android ignores it: the Keystore key
 * never leaves the device, and the config plugin keeps the secure store out of Auto Backup.
 * Used for every secure store item (refresh token, offline storage key).
 */
export const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};
