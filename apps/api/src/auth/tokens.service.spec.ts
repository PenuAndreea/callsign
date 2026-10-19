import type { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import type { Env } from '../config/env.schema';
import { jwtOptions } from './jwt-options';
import { TokensService } from './tokens.service';

const SECRET = 'unit-test-secret-that-is-at-least-32-chars';
const user = { id: '6650c0ffee0000000000abcd', callsign: 'wolf-2' };

const config = { get: () => 30 } as unknown as ConfigService<Env, true>;
const tokens = new TokensService(new JwtService(jwtOptions(SECRET, 900)), config);

/** Signs arbitrary claims with the real secret (no default expiry), to craft bad tokens. */
const rawJwt = new JwtService({ secret: SECRET });

function base64url(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

describe('TokensService', () => {
  describe('access tokens', () => {
    it('round-trips the user', async () => {
      const token = await tokens.signAccessToken(user);
      await expect(tokens.verifyAccessToken(token)).resolves.toEqual({
        userId: user.id,
        callsign: user.callsign,
      });
    });

    it('expires after the configured TTL', async () => {
      const token = await tokens.signAccessToken(user);
      const { iat, exp } = rawJwt.decode<{ iat: number; exp: number }>(token);
      expect(exp - iat).toBe(900);
    });

    const rejects = (token: string) =>
      expect(tokens.verifyAccessToken(token)).rejects.toMatchObject({
        response: { statusCode: 401, code: 'UNAUTHORIZED' },
      });

    it('rejects an expired token', async () => {
      const exp = Math.floor(Date.now() / 1000) - 10;
      await rejects(await rawJwt.signAsync({ sub: user.id, callsign: user.callsign, exp }));
    });

    it('rejects a token signed with another secret', async () => {
      const other = new JwtService({ secret: 'another-secret-that-is-at-least-32-chars' });
      await rejects(await other.signAsync({ sub: user.id, callsign: user.callsign }));
    });

    it('rejects a tampered payload', async () => {
      const [header, , signature] = (await tokens.signAccessToken(user)).split('.');
      const forged = base64url({ sub: 'someone-else', callsign: 'admin' });
      await rejects(`${header}.${forged}.${signature}`);
    });

    it('rejects an unsigned `alg: none` token', async () => {
      const header = base64url({ alg: 'none', typ: 'JWT' });
      await rejects(`${header}.${base64url({ sub: user.id, callsign: user.callsign })}.`);
    });

    it('rejects a valid signature with unexpected claims', async () => {
      await rejects(await rawJwt.signAsync({ sub: user.id }));
    });

    it('rejects garbage', async () => {
      await rejects('not-a-jwt');
    });
  });

  describe('refresh tokens', () => {
    it('creates a 256-bit url-safe token with its SHA-256 hash', () => {
      const { token, hash } = tokens.createRefreshToken();
      expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
      expect(hash).toBe(tokens.hashRefreshToken(token));
    });

    it('creates a different token every time', () => {
      expect(tokens.createRefreshToken().token).not.toBe(tokens.createRefreshToken().token);
    });

    it('expires after the configured number of days', () => {
      const { expiresAt } = tokens.createRefreshToken();
      const days = (expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
      expect(days).toBeCloseTo(30, 3);
    });
  });

  describe('refresh reuse grace', () => {
    it('reads REFRESH_REUSE_GRACE_SECONDS in milliseconds', () => {
      const graceConfig = {
        get: (key: keyof Env) => (key === 'REFRESH_REUSE_GRACE_SECONDS' ? 10 : 30),
      } as unknown as ConfigService<Env, true>;
      const withGrace = new TokensService(new JwtService(jwtOptions(SECRET, 900)), graceConfig);
      expect(withGrace.refreshReuseGraceMs()).toBe(10_000);
    });
  });
});
