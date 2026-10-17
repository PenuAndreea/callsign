import type { ApiError, AuthResponse, ErrorCode, UserDto } from '@callsign/types';
import { HttpResponse } from 'msw';

import type { ApiPlatform, RefreshTokenStore } from '../platform/platform.types';
import { API_URL } from './server';

export const wolf: UserDto = {
  id: '6650c0ffee0000000000f00d',
  callsign: 'wolf-2',
  createdAt: '2026-10-17T22:14:00.000Z',
};

export function authResponse(accessToken: string, refreshToken?: string): AuthResponse {
  return { user: wolf, accessToken, ...(refreshToken !== undefined && { refreshToken }) };
}

export function apiError(statusCode: number, code: ErrorCode): HttpResponse<ApiError> {
  return HttpResponse.json({ statusCode, code, message: code }, { status: statusCode });
}

export const webPlatform: ApiPlatform = { apiUrl: API_URL, client: 'web' };

/** An in-memory secure store, so tests can read what the client wrote. */
export class MemoryTokenStore implements RefreshTokenStore {
  constructor(public token: string | null = null) {}

  read(): Promise<string | null> {
    return Promise.resolve(this.token);
  }

  write(token: string): Promise<void> {
    this.token = token;
    return Promise.resolve();
  }

  clear(): Promise<void> {
    this.token = null;
    return Promise.resolve();
  }
}

export function mobilePlatform(store: RefreshTokenStore): ApiPlatform {
  return { apiUrl: API_URL, client: 'mobile', refreshTokenStore: store };
}
