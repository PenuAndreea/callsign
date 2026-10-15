import { Types } from 'mongoose';

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

const users = {
  create: jest.fn(),
  findById: jest.fn(),
  findByCallsignWithPassword: jest.fn(),
  setRefreshToken: jest.fn(),
  rotateRefreshToken: jest.fn(),
  clearRefreshToken: jest.fn(),
};
const hasher = { hash: jest.fn(), verify: jest.fn() };
const tokens = {
  signAccessToken: jest.fn(),
  createRefreshToken: jest.fn(),
  hashRefreshToken: jest.fn((token: string) => `hash(${token})`),
};

const auth = new AuthService(
  users as unknown as UsersService,
  hasher as unknown as PasswordHasher,
  tokens as unknown as TokensService,
);

const expectCode = (promise: Promise<unknown>, statusCode: number, code: string) =>
  expect(promise).rejects.toMatchObject({ response: { statusCode, code } });

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    tokens.signAccessToken.mockResolvedValue('access');
    tokens.createRefreshToken.mockReturnValue(nextToken);
  });

  describe('register', () => {
    it('stores the hash, never the passphrase, and starts a session', async () => {
      hasher.hash.mockResolvedValue('argon-hash');
      users.create.mockResolvedValue(userDoc);

      const session = await auth.register({ callsign: 'wolf-2', passphrase: 'secret12' });

      expect(users.create).toHaveBeenCalledWith('wolf-2', 'argon-hash');
      expect(users.setRefreshToken).toHaveBeenCalledWith(
        userDto.id,
        nextToken.hash,
        nextToken.expiresAt,
      );
      expect(tokens.signAccessToken).toHaveBeenCalledWith({ id: userDto.id, callsign: 'wolf-2' });
      expect(session).toEqual({ user: userDto, accessToken: 'access', refreshToken: nextToken });
    });
  });

  describe('login', () => {
    it('starts a session for the right passphrase', async () => {
      users.findByCallsignWithPassword.mockResolvedValue(userDoc);
      hasher.verify.mockResolvedValue(true);

      const session = await auth.login({ callsign: 'wolf-2', passphrase: 'secret12' });

      expect(hasher.verify).toHaveBeenCalledWith('stored-hash', 'secret12');
      expect(session.user).toEqual(userDto);
    });

    it('rejects a wrong passphrase with INVALID_CREDENTIALS', async () => {
      users.findByCallsignWithPassword.mockResolvedValue(userDoc);
      hasher.verify.mockResolvedValue(false);
      await expectCode(
        auth.login({ callsign: 'wolf-2', passphrase: 'x' }),
        401,
        'INVALID_CREDENTIALS',
      );
      expect(users.setRefreshToken).not.toHaveBeenCalled();
    });

    it('verifies even for an unknown callsign, then gives the same error', async () => {
      users.findByCallsignWithPassword.mockResolvedValue(null);
      hasher.verify.mockResolvedValue(false);
      await expectCode(
        auth.login({ callsign: 'nobody', passphrase: 'x' }),
        401,
        'INVALID_CREDENTIALS',
      );
      expect(hasher.verify).toHaveBeenCalledWith(undefined, 'x');
    });
  });

  describe('refresh', () => {
    it('rotates by the hash of the presented token', async () => {
      users.rotateRefreshToken.mockResolvedValue(userDoc);

      const session = await auth.refresh('current');

      expect(users.rotateRefreshToken).toHaveBeenCalledWith(
        'hash(current)',
        nextToken.hash,
        nextToken.expiresAt,
      );
      expect(session).toEqual({ user: userDto, accessToken: 'access', refreshToken: nextToken });
    });

    it('rejects a missing token without touching the database', async () => {
      await expectCode(auth.refresh(undefined), 401, 'UNAUTHORIZED');
      expect(users.rotateRefreshToken).not.toHaveBeenCalled();
    });

    it('rejects an unknown, reused or expired token', async () => {
      users.rotateRefreshToken.mockResolvedValue(null);
      await expectCode(auth.refresh('stale'), 401, 'UNAUTHORIZED');
    });
  });

  describe('logout', () => {
    it('clears the session of the presented token', async () => {
      await auth.logout('current');
      expect(users.clearRefreshToken).toHaveBeenCalledWith('hash(current)');
    });

    it('is a no-op without a token', async () => {
      await expect(auth.logout(undefined)).resolves.toBeUndefined();
      expect(users.clearRefreshToken).not.toHaveBeenCalled();
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
