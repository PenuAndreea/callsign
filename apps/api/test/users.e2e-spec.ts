import type { TestingModule } from '@nestjs/testing';
import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import type { Model } from 'mongoose';
import { Types } from 'mongoose';

import { ApiException } from '../src/common/errors/api.exception';
import { User } from '../src/users/user.schema';
import { UsersModule } from '../src/users/users.module';
import { UsersService } from '../src/users/users.service';

// UsersService against a real MongoDB: indexes, `select: false` and atomic updates are
// database behavior, so mocking the model would test nothing.
describe('UsersService (Mongo)', () => {
  let moduleRef: TestingModule;
  let users: UsersService;
  let userModel: Model<User>;

  const inAnHour = () => new Date(Date.now() + 60 * 60 * 1000);

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [MongooseModule.forRoot(process.env.MONGODB_URI ?? ''), UsersModule],
    }).compile();
    users = moduleRef.get(UsersService);
    userModel = moduleRef.get(getModelToken(User.name));
    // Indexes build in the background; wait, or the unique checks below could race them.
    await userModel.init();
  });

  afterEach(async () => {
    await userModel.deleteMany({});
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  describe('create', () => {
    it('stores the user with timestamps', async () => {
      const user = await users.create('wolf-2', 'hash');
      expect(user.callsign).toBe('wolf-2');
      expect(user.createdAt).toBeInstanceOf(Date);
    });

    it('rejects a taken callsign with CALLSIGN_TAKEN', async () => {
      await users.create('wolf-2', 'hash');
      await expect(users.create('wolf-2', 'other')).rejects.toMatchObject({
        response: { statusCode: 409, code: 'CALLSIGN_TAKEN' },
      });
    });

    it('lets only one of two concurrent registrations win', async () => {
      const results = await Promise.allSettled([
        users.create('wolf-2', 'a'),
        users.create('wolf-2', 'b'),
      ]);
      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      const rejected = results.find((r) => r.status === 'rejected');
      expect(rejected?.reason).toBeInstanceOf(ApiException);
    });

    it('allows many logged-out users (null refresh hash is not indexed)', async () => {
      await users.create('wolf-1', 'hash');
      await expect(users.create('wolf-2', 'hash')).resolves.toBeDefined();
    });
  });

  describe('find', () => {
    it('findById leaves the secrets out', async () => {
      const { id } = await users.create('wolf-2', 'hash');
      const found = await users.findById(id);
      expect(found?.callsign).toBe('wolf-2');
      expect(found?.passwordHash).toBeUndefined();
      expect(found?.refreshTokenHash).toBeUndefined();
    });

    it('findById returns null for unknown and malformed ids', async () => {
      await expect(users.findById(new Types.ObjectId().toHexString())).resolves.toBeNull();
      await expect(users.findById('not-an-id')).resolves.toBeNull();
    });

    it('findByCallsignWithPassword includes the hash', async () => {
      await users.create('wolf-2', 'hash');
      const found = await users.findByCallsignWithPassword('wolf-2');
      expect(found?.passwordHash).toBe('hash');
      await expect(users.findByCallsignWithPassword('nobody')).resolves.toBeNull();
    });
  });

  describe('refresh tokens', () => {
    let userId: string;

    beforeEach(async () => {
      ({ id: userId } = await users.create('wolf-2', 'hash'));
      await users.setRefreshToken(userId, 'token-1', inAnHour());
    });

    it('rotates a valid token, and the old one stops working', async () => {
      const rotated = await users.rotateRefreshToken('token-1', 'token-2', inAnHour());
      expect(rotated?.id).toBe(userId);
      await expect(users.rotateRefreshToken('token-1', 'token-3', inAnHour())).resolves.toBeNull();
      await expect(
        users.rotateRefreshToken('token-2', 'token-3', inAnHour()),
      ).resolves.not.toBeNull();
    });

    it('lets only one of two concurrent rotations win', async () => {
      const results = await Promise.all([
        users.rotateRefreshToken('token-1', 'token-a', inAnHour()),
        users.rotateRefreshToken('token-1', 'token-b', inAnHour()),
      ]);
      expect(results.filter((user) => user !== null)).toHaveLength(1);
    });

    it('refuses an expired token', async () => {
      await users.setRefreshToken(userId, 'old', new Date(Date.now() - 1000));
      await expect(users.rotateRefreshToken('old', 'new', inAnHour())).resolves.toBeNull();
    });

    it('a new login replaces the previous session', async () => {
      await users.setRefreshToken(userId, 'token-2', inAnHour());
      await expect(users.rotateRefreshToken('token-1', 'x', inAnHour())).resolves.toBeNull();
    });

    it('logout clears the session; an unknown token is a no-op', async () => {
      await users.clearRefreshToken('token-1');
      await expect(users.rotateRefreshToken('token-1', 'x', inAnHour())).resolves.toBeNull();
      await expect(users.clearRefreshToken('unknown')).resolves.toBeUndefined();
    });
  });
});
