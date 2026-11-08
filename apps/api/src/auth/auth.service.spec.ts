import { Types } from 'mongoose';

import type { RequestOrigin } from '../common/security/security-event';
import type { SecurityLog } from '../common/security/security-log.service';
import type { SessionsService } from '../sessions/sessions.service';
import type { UserDocument } from '../users/user.schema';
import type { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import type { PasswordHasher } from './password-hasher.service';
import type { RefreshToken, TokensService } from './tokens.service';

const _id = new Types.ObjectId();
const userDoc = {
  _id,
  id: _id.toHexString(),
  callsign: 'wolf-2',
  passwordHash: 'stored-hash',
  createdAt: new Date('2026-10-15T22:14:00.000Z'),
} as unknown as UserDocument;
const userDto = {
  id: _id.toHexString(),
  callsign: 'wolf-2',
  createdAt: '2026-10-15T22:14:00.000Z',
};
const nextToken: RefreshToken = { token: 'next', hash: 'next-hash', expiresAt: new Date() };

const users = { create: jest.fn(), findById: jest.fn(), findByCallsignWithPassword: jest.fn() };
const sessions = { create: jest.fn(), rotate: jest.fn(), revoke: jest.fn() };
const hasher = { hash: jest.fn(), verify: jest.fn() };
const tokens = {
  signAccessToken: jest.fn(),
  createRefreshToken: jest.fn(),
  hashRefreshToken: jest.fn((token: string) => `hash(${token})`),
  refreshReuseGraceMs: jest.fn(() => 10_000),
};

const securityLog = { record: jest.fn() };

const auth = new AuthService(
  users as unknown as UsersService,
  sessions as unknown as SessionsService,
  hasher as unknown as PasswordHasher,
  tokens as unknown as TokensService,
  securityLog as unknown as SecurityLog,
);

const fromWeb: RequestOrigin = { ip: '203.0.113.7', client: 'web' };
const fromMobile: RequestOrigin = { ip: '198.51.100.4', client: 'mobile' };

const expectCode = (promise: Promise<unknown>, statusCode: number, code: string) =>
  expect(promise).rejects.toMatchObject({ response: { statusCode, code } });

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    tokens.signAccessToken.mockResolvedValue('access');
    tokens.createRefreshToken.mockReturnValue(nextToken);
  });

  describe('register', () => {
    it('stores the hash, never the passphrase, and starts a session for the device', async () => {
      hasher.hash.mockResolvedValue('argon-hash');
      users.create.mockResolvedValue(userDoc);

      const issued = await auth.register({ callsign: 'wolf-2', passphrase: 'secret12' }, 'web');

      expect(users.create).toHaveBeenCalledWith('wolf-2', 'argon-hash');
      expect(sessions.create).toHaveBeenCalledWith(userDto.id, 'web', nextToken);
      expect(tokens.signAccessToken).toHaveBeenCalledWith({ id: userDto.id, callsign: 'wolf-2' });
      expect(issued).toEqual({ user: userDto, accessToken: 'access', refreshToken: nextToken });
    });
  });

  describe('login', () => {
    it('starts a session for the right passphrase', async () => {
      users.findByCallsignWithPassword.mockResolvedValue(userDoc);
      hasher.verify.mockResolvedValue(true);

      const issued = await auth.login({ callsign: 'wolf-2', passphrase: 'secret12' }, fromMobile);

      expect(hasher.verify).toHaveBeenCalledWith('stored-hash', 'secret12');
      expect(sessions.create).toHaveBeenCalledWith(userDto.id, 'mobile', nextToken);
      expect(issued.user).toEqual(userDto);
      expect(securityLog.record).toHaveBeenCalledWith({
        event: 'login_succeeded',
        userId: userDto.id,
        callsign: 'wolf-2',
        ...fromMobile,
      });
    });

    it('rejects a wrong passphrase with INVALID_CREDENTIALS and logs why', async () => {
      users.findByCallsignWithPassword.mockResolvedValue(userDoc);
      hasher.verify.mockResolvedValue(false);
      await expectCode(
        auth.login({ callsign: 'wolf-2', passphrase: 'x' }, fromWeb),
        401,
        'INVALID_CREDENTIALS',
      );
      expect(sessions.create).not.toHaveBeenCalled();
      expect(securityLog.record).toHaveBeenCalledWith({
        event: 'login_failed',
        callsign: 'wolf-2',
        reason: 'wrong_passphrase',
        ...fromWeb,
      });
    });

    it('verifies even for an unknown callsign, then gives the same error', async () => {
      users.findByCallsignWithPassword.mockResolvedValue(null);
      hasher.verify.mockResolvedValue(false);
      await expectCode(
        auth.login({ callsign: 'nobody', passphrase: 'x' }, fromWeb),
        401,
        'INVALID_CREDENTIALS',
      );
      expect(hasher.verify).toHaveBeenCalledWith(undefined, 'x');
      expect(securityLog.record).toHaveBeenCalledWith({
        event: 'login_failed',
        callsign: 'nobody',
        reason: 'unknown_callsign',
        ...fromWeb,
      });
    });

    it('never puts the passphrase in the security log', async () => {
      users.findByCallsignWithPassword.mockResolvedValue(userDoc);
      hasher.verify.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
      const body = { callsign: 'wolf-2', passphrase: 'very secret phrase' };

      await auth.login(body, fromWeb).catch(() => undefined);
      await auth.login(body, fromWeb);

      expect(securityLog.record).toHaveBeenCalledTimes(2);
      expect(JSON.stringify(securityLog.record.mock.calls)).not.toContain('very secret phrase');
    });
  });

  describe('refresh', () => {
    it('rotates by the hash of the presented token, then loads the user', async () => {
      sessions.rotate.mockResolvedValue({ userId: _id });
      users.findById.mockResolvedValue(userDoc);

      const issued = await auth.refresh('current');

      expect(sessions.rotate).toHaveBeenCalledWith('hash(current)', nextToken, 10_000);
      expect(users.findById).toHaveBeenCalledWith(userDto.id);
      expect(issued).toEqual({ user: userDto, accessToken: 'access', refreshToken: nextToken });
    });

    it('rejects a missing token without touching the database', async () => {
      await expectCode(auth.refresh(undefined), 401, 'UNAUTHORIZED');
      expect(sessions.rotate).not.toHaveBeenCalled();
    });

    it('rejects an unknown, reused or expired token', async () => {
      sessions.rotate.mockResolvedValue(null);
      await expectCode(auth.refresh('stale'), 401, 'UNAUTHORIZED');
    });

    it('rejects a session whose user no longer exists', async () => {
      sessions.rotate.mockResolvedValue({ userId: _id });
      users.findById.mockResolvedValue(null);
      await expectCode(auth.refresh('current'), 401, 'UNAUTHORIZED');
    });
  });

  describe('logout', () => {
    it('revokes the session of the presented token', async () => {
      await auth.logout('current');
      expect(sessions.revoke).toHaveBeenCalledWith('hash(current)');
    });

    it('is a no-op without a token', async () => {
      await expect(auth.logout(undefined)).resolves.toBeUndefined();
      expect(sessions.revoke).not.toHaveBeenCalled();
    });
  });

  describe('me', () => {
    it('returns the user', async () => {
      users.findById.mockResolvedValue(userDoc);
      await expect(auth.me(userDto.id)).resolves.toEqual(userDto);
    });

    it('rejects when the user no longer exists', async () => {
      users.findById.mockResolvedValue(null);
      await expectCode(auth.me(userDto.id), 401, 'UNAUTHORIZED');
    });
  });
});
