import * as SecureStore from 'expo-secure-store';

import {
  assertSecureApiUrl,
  createMobilePlatform,
  defaultApiUrl,
  SECURE_STORE_OPTIONS,
  secureRefreshTokenStore,
} from '@/platform';

jest.mock('expo-secure-store', () => ({
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'after-first-unlock-this-device-only',
  getItemAsync: jest.fn(() => Promise.resolve('stored-token')),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

describe('defaultApiUrl', () => {
  it('reaches the Mac at localhost from the iOS simulator', () => {
    expect(defaultApiUrl('ios')).toBe('http://localhost:3000');
  });

  it('reaches the Mac at 10.0.2.2 from the Android emulator', () => {
    expect(defaultApiUrl('android')).toBe('http://10.0.2.2:3000');
  });
});

describe('assertSecureApiUrl', () => {
  it('allows http in development builds', () => {
    expect(() => assertSecureApiUrl('http://localhost:3000', true)).not.toThrow();
  });

  it('allows https in release builds', () => {
    expect(() => assertSecureApiUrl('https://api.callsign.example', false)).not.toThrow();
  });

  it.each(['http://192.168.1.20:3000', 'ws://api.callsign.example', ''])(
    'refuses %j in release builds',
    (url) => {
      expect(() => assertSecureApiUrl(url, false)).toThrow(/https API URL/);
    },
  );
});

describe('createMobilePlatform', () => {
  it('is a mobile client with the secure store and a socket factory', () => {
    const platform = createMobilePlatform('http://192.168.1.20:3000', true);
    expect(platform).toMatchObject({ apiUrl: 'http://192.168.1.20:3000', client: 'mobile' });
    expect(platform.client === 'mobile' && platform.refreshTokenStore).toBe(
      secureRefreshTokenStore,
    );
    expect(typeof platform.createSocket).toBe('function');
  });

  it('refuses a plain-http API in a release build', () => {
    expect(() => createMobilePlatform('http://192.168.1.20:3000', false)).toThrow(/https API URL/);
  });
});

describe('secureRefreshTokenStore', () => {
  beforeEach(() => jest.clearAllMocks());

  it('keeps the refresh token under one key, device-only, after first unlock', async () => {
    expect(SECURE_STORE_OPTIONS).toEqual({
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
    });

    await expect(secureRefreshTokenStore.read()).resolves.toBe('stored-token');
    await secureRefreshTokenStore.clear();

    expect(SecureStore.getItemAsync).toHaveBeenCalledWith(
      'callsign.refreshToken',
      SECURE_STORE_OPTIONS,
    );
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(
      'callsign.refreshToken',
      SECURE_STORE_OPTIONS,
    );
  });

  it('replaces the item on write, so an older token takes the new accessibility', async () => {
    await secureRefreshTokenStore.write('rotated');

    const deleteOrder = jest.mocked(SecureStore.deleteItemAsync).mock.invocationCallOrder[0];
    const setOrder = jest.mocked(SecureStore.setItemAsync).mock.invocationCallOrder[0];
    expect(deleteOrder).toBeLessThan(setOrder ?? 0);
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      'callsign.refreshToken',
      'rotated',
      SECURE_STORE_OPTIONS,
    );
  });
});
