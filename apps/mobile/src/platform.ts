import type { ApiPlatform, RefreshTokenStore } from '@callsign/hooks';
import { defaultSocketFactory } from '@callsign/hooks';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const REFRESH_TOKEN_KEY = 'callsign.refreshToken';

/**
 * iOS: readable after the first unlock since boot (so a background refresh still works), and
 * never in iCloud/iTunes backups or moved to another device. Android ignores it: the Keystore key
 * never leaves the device, and the config plugin keeps the secure store out of Auto Backup.
 */
export const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

/** The refresh token in the OS keychain (iOS) / keystore (Android), never in plain storage. */
export const secureRefreshTokenStore: RefreshTokenStore = {
  read: () => SecureStore.getItemAsync(REFRESH_TOKEN_KEY, SECURE_STORE_OPTIONS),
  // Delete first: on iOS, writing a key that exists only updates its value and keeps the old
  // accessibility, so a token saved before this setting would keep the old one forever.
  write: async (token) => {
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY, SECURE_STORE_OPTIONS);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token, SECURE_STORE_OPTIONS);
  },
  clear: () => SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY, SECURE_STORE_OPTIONS),
};

/**
 * Where the dev API is from a simulator: the iOS simulator shares the Mac's `localhost`; the
 * Android emulator reaches the Mac at `10.0.2.2`. A real phone needs `EXPO_PUBLIC_API_URL`
 * (the Mac's LAN address).
 */
export function defaultApiUrl(os: typeof Platform.OS = Platform.OS): string {
  return os === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';
}

/**
 * Release builds only talk to the API over TLS: tokens and messages never cross the network in
 * plain text. Development builds may use http (simulator, emulator, LAN).
 * @throws at startup when a release build is configured with a non-https API URL.
 */
export function assertSecureApiUrl(apiUrl: string, isDev: boolean): void {
  if (isDev || apiUrl.startsWith('https://')) return;
  throw new Error(
    `Release builds need an https API URL, got "${apiUrl}". Set EXPO_PUBLIC_API_URL.`,
  );
}

/**
 * The mobile side of the API: refresh token in the request body, kept in the secure store;
 * WebSocket only (long-polling is unreliable in React Native).
 */
export function createMobilePlatform(
  // Expo inlines `EXPO_PUBLIC_*` at build time: read it with the literal name.
  apiUrl: string = process.env.EXPO_PUBLIC_API_URL ?? defaultApiUrl(),
  isDev: boolean = __DEV__,
): ApiPlatform {
  assertSecureApiUrl(apiUrl, isDev);
  return {
    apiUrl,
    client: 'mobile',
    refreshTokenStore: secureRefreshTokenStore,
    createSocket: defaultSocketFactory(apiUrl, { transports: ['websocket'] }),
  };
}
