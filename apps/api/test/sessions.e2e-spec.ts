import { Logger } from '@nestjs/common';
import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { Model } from 'mongoose';
import { Types } from 'mongoose';

import type { RefreshToken } from '../src/auth/tokens.service';
import type { SessionDocument } from '../src/sessions/session.schema';
import { Session } from '../src/sessions/session.schema';
import { SessionsModule } from '../src/sessions/sessions.module';
import type { RotateResult } from '../src/sessions/sessions.service';
import { SessionsService } from '../src/sessions/sessions.service';

const HOUR_MS = 60 * 60 * 1000;
const GRACE_MS = 10_000;

/** A token whose hash is `name` (hashing is TokensService's job; here only the hash matters). */
function token(name: string, expiresInMs = HOUR_MS): RefreshToken {
  return { token: `raw-${name}`, hash: name, expiresAt: new Date(Date.now() + expiresInMs) };
}

const INVALID: RotateResult = { status: 'invalid' };
const ROTATED = { status: 'rotated' };

/** The session from a successful rotation; fails the test for any other result. */
function rotatedSession(result: RotateResult): SessionDocument {
  if (result.status !== 'rotated') throw new Error(`Expected a rotation, got ${result.status}`);
  return result.session;
}

// SessionsService against a real MongoDB: atomic rotation, the TTL index and reuse detection.
describe('SessionsService (Mongo)', () => {
  let moduleRef: TestingModule;
  let sessions: SessionsService;
  let sessionModel: Model<Session>;
  const userId = new Types.ObjectId().toHexString();
  /** The `t1` session every test starts with (its id, as `create` returns it). */
  let mobileSessionId: string;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [MongooseModule.forRoot(process.env.MONGODB_URI ?? ''), SessionsModule],
    }).compile();
    sessions = moduleRef.get(SessionsService);
    sessionModel = moduleRef.get(getModelToken(Session.name));
    await sessionModel.init();
  });

  beforeEach(async () => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    mobileSessionId = await sessions.create(userId, 'mobile', token('t1'));
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await sessionModel.deleteMany({});
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it('keeps one session per device', async () => {
    await sessions.create(userId, 'web', token('w1'));
    await expect(sessionModel.countDocuments({ userId })).resolves.toBe(2);
  });

  it('returns the new session’s id', async () => {
    const session = await sessionModel.findOne({ tokenHash: 't1' }).orFail();
    expect(mobileSessionId).toBe(session.id);
  });

  it('declares a TTL index on expiresAt', async () => {
    const indexes = await sessionModel.listIndexes();
    expect(indexes).toContainEqual(
      expect.objectContaining({ key: { expiresAt: 1 }, expireAfterSeconds: 0 }),
    );
  });

  describe('rotate', () => {
    it('swaps the token, remembers the previous one and slides the expiry', async () => {
      const next = token('t2', 30 * 24 * HOUR_MS);
      const rotated = rotatedSession(await sessions.rotate('t1', next));
      expect(rotated).toMatchObject({ tokenHash: 't2', previousTokenHash: 't1' });
      expect(rotated.userId.toHexString()).toBe(userId);
      expect(rotated.expiresAt).toEqual(next.expiresAt);
    });

    it('lets only one of two concurrent rotations win without a grace window', async () => {
      const results = await Promise.all([
        sessions.rotate('t1', token('a')),
        sessions.rotate('t1', token('b')),
      ]);
      expect(results.filter((result) => result.status === 'rotated')).toHaveLength(1);
    });

    it('lets both concurrent rotations through within the grace window, without revoking', async () => {
      const results = await Promise.all([
        sessions.rotate('t1', token('a'), GRACE_MS),
        sessions.rotate('t1', token('b'), GRACE_MS),
      ]);
      expect(results.every((result) => result.status === 'rotated')).toBe(true);
      await expect(sessionModel.countDocuments({ userId })).resolves.toBe(1);
    });

    it('records when the previous token was rotated away', async () => {
      const before = Date.now();
      const rotated = rotatedSession(await sessions.rotate('t1', token('t2')));
      expect(rotated.rotatedAt?.getTime()).toBeGreaterThanOrEqual(before);
    });

    it('refreshes the previous token within the window and keeps the window where it was', async () => {
      const first = rotatedSession(await sessions.rotate('t1', token('t2'), GRACE_MS));
      const retried = rotatedSession(await sessions.rotate('t1', token('t3'), GRACE_MS));

      expect(retried).toMatchObject({ tokenHash: 't3', previousTokenHash: 't1' });
      expect(retried.rotatedAt).toEqual(first.rotatedAt);
      expect(Logger.prototype.warn).not.toHaveBeenCalled();
    });

    it('revokes the previous token after the window', async () => {
      await sessions.rotate('t1', token('t2'), GRACE_MS);
      await sessionModel.updateMany({}, { rotatedAt: new Date(Date.now() - 2 * GRACE_MS) });

      await expect(sessions.rotate('t1', token('attacker'), GRACE_MS)).resolves.toMatchObject({
        status: 'reused',
      });
      await expect(sessionModel.countDocuments({ userId })).resolves.toBe(0);
    });

    it('refuses an expired token (before the TTL job deletes it)', async () => {
      await sessions.create(userId, 'web', token('old', -1000));
      await expect(sessions.rotate('old', token('new'))).resolves.toEqual(INVALID);
    });

    it('refuses an unknown token without touching other sessions', async () => {
      await expect(sessions.rotate('nope', token('x'))).resolves.toEqual(INVALID);
      await expect(sessions.rotate('t1', token('t2'))).resolves.toMatchObject(ROTATED);
    });

    it('revokes the session when a rotated-away token is reused', async () => {
      await sessions.rotate('t1', token('t2'));

      // The revoked session's id, so the caller can close its sockets.
      await expect(sessions.rotate('t1', token('attacker'))).resolves.toEqual({
        status: 'reused',
        sessionId: mobileSessionId,
      });

      // The legitimate client's current token is dead too: everyone logs in again.
      await expect(sessions.rotate('t2', token('t3'))).resolves.toEqual(INVALID);
      await expect(sessionModel.countDocuments({ userId })).resolves.toBe(0);
      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'refresh_token_reuse', userId: String(userId) }),
      );
    });

    it('reuse only revokes the affected session, not the user’s other devices', async () => {
      await sessions.create(userId, 'web', token('w1'));
      await sessions.rotate('t1', token('t2'));
      await sessions.rotate('t1', token('attacker'));
      await expect(sessions.rotate('w1', token('w2'))).resolves.toMatchObject(ROTATED);
    });
  });

  describe('revoke', () => {
    it('ends one device and leaves the others; an unknown token is a no-op', async () => {
      await sessions.create(userId, 'web', token('w1'));

      // The ended session's id, so the caller can close its sockets.
      await expect(sessions.revoke('t1')).resolves.toBe(mobileSessionId);
      await expect(sessions.rotate('t1', token('x'))).resolves.toEqual(INVALID);
      await expect(sessions.rotate('w1', token('w2'))).resolves.toMatchObject(ROTATED);
      await expect(sessions.revoke('unknown')).resolves.toBeNull();
    });
  });
});
