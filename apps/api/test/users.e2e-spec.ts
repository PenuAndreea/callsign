import type { TestingModule } from '@nestjs/testing';
import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import type { Model } from 'mongoose';
import { Types } from 'mongoose';

import { ApiException } from '../src/common/errors/api.exception';
import { User } from '../src/users/user.schema';
import { UsersModule } from '../src/users/users.module';
import { UsersService } from '../src/users/users.service';

// UsersService against a real MongoDB: unique indexes and `select: false` are database
// behavior, so mocking the model would test nothing.
describe('UsersService (Mongo)', () => {
  let moduleRef: TestingModule;
  let users: UsersService;
  let userModel: Model<User>;

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
  });

  describe('find', () => {
    it('findById leaves the passphrase hash out', async () => {
      const { id } = await users.create('wolf-2', 'hash');
      const found = await users.findById(id);
      expect(found?.callsign).toBe('wolf-2');
      expect(found?.passwordHash).toBeUndefined();
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
});
