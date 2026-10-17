import type { ApiPlatform, RefreshTokenStore } from '@callsign/hooks';
import { defaultSocketFactory } from '@callsign/hooks';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const REFRESH_TOKEN_KEY = 'callsign.refreshToken';

/** The refresh token in the OS keychain (iOS) / keystore (Android), never in plain storage. */
export const secureRefreshTokenStore: RefreshTokenStore = {
  read: () => SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
  write: (token) => SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token),
  clear: () => SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
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
 * The mobile side of the API: refresh token in the request body, kept in the secure store;
 * WebSocket only (long-polling is unreliable in React Native).
 */
export function createMobilePlatform(
  // Expo inlines `EXPO_PUBLIC_*` at build time: read it with the literal name.
  apiUrl: string = process.env.EXPO_PUBLIC_API_URL ?? defaultApiUrl(),
): ApiPlatform {
  return {
    apiUrl,
    client: 'mobile',
    refreshTokenStore: secureRefreshTokenStore,
    createSocket: defaultSocketFactory(apiUrl, { transports: ['websocket'] }),
  };
}
