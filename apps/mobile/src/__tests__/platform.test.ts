import * as SecureStore from 'expo-secure-store';

import { createMobilePlatform, defaultApiUrl, secureRefreshTokenStore } from '@/platform';

jest.mock('expo-secure-store', () => ({
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

describe('createMobilePlatform', () => {
  it('is a mobile client with the secure store and a socket factory', () => {
    const platform = createMobilePlatform('http://192.168.1.20:3000');
    expect(platform).toMatchObject({ apiUrl: 'http://192.168.1.20:3000', client: 'mobile' });
    expect(platform.client === 'mobile' && platform.refreshTokenStore).toBe(
      secureRefreshTokenStore,
    );
    expect(typeof platform.createSocket).toBe('function');
  });
});

describe('secureRefreshTokenStore', () => {
  it('keeps the refresh token under one key in the secure store', async () => {
    await expect(secureRefreshTokenStore.read()).resolves.toBe('stored-token');
    await secureRefreshTokenStore.write('rotated');
    await secureRefreshTokenStore.clear();

    expect(SecureStore.getItemAsync).toHaveBeenCalledWith('callsign.refreshToken');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('callsign.refreshToken', 'rotated');
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('callsign.refreshToken');
  });
});
