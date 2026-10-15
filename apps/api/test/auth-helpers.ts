import type { AuthResponse, ClientType } from '@callsign/types';
import request from 'supertest';
import type { App } from 'supertest/types';

export const CREDENTIALS = { callsign: 'wolf-2', passphrase: 'correct horse' };

/** Registers through the API and returns the parsed body and the raw `Set-Cookie` header. */
export async function register(
  server: App,
  client: ClientType = 'mobile',
  credentials = CREDENTIALS,
): Promise<{ body: AuthResponse; cookies: string[] }> {
  const res = await request(server)
    .post('/api/auth/register')
    .set('X-Client', client)
    .send(credentials)
    .expect(201);
  return { body: res.body as AuthResponse, cookies: setCookies(res.headers) };
}

export function setCookies(headers: Record<string, unknown>): string[] {
  const value = headers['set-cookie'];
  return Array.isArray(value) ? (value as string[]) : [];
}

/** The `refreshToken` cookie value from `Set-Cookie`, or undefined. */
export function refreshCookie(cookies: string[]): string | undefined {
  return cookies.find((cookie) => cookie.startsWith('refreshToken='));
}
