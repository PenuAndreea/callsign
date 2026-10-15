import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { Model } from 'mongoose';
import { Types } from 'mongoose';

import { Membership } from '../src/memberships/membership.schema';
import { MembershipsModule } from '../src/memberships/memberships.module';
import { MembershipsService } from '../src/memberships/memberships.service';

const newId = (): string => new Types.ObjectId().toHexString();

// MembershipsService against a real MongoDB: the unique index decides joins, also under races.
describe('MembershipsService (Mongo)', () => {
  let moduleRef: TestingModule;
  let memberships: MembershipsService;
  let membershipModel: Model<Membership>;
  const userId = newId();
  const roomId = newId();

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [MongooseModule.forRoot(process.env.MONGODB_URI ?? ''), MembershipsModule],
    }).compile();
    memberships = moduleRef.get(MembershipsService);
    membershipModel = moduleRef.get(getModelToken(Membership.name));
    await membershipModel.init();
  });

  afterEach(async () => {
    await membershipModel.deleteMany({});
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it('declares the unique { userId, roomId } index and the { roomId } index', async () => {
    const indexes = await membershipModel.listIndexes();
    expect(indexes).toContainEqual(
      expect.objectContaining({ key: { userId: 1, roomId: 1 }, unique: true }),
    );
    expect(indexes).toContainEqual(expect.objectContaining({ key: { roomId: 1 } }));
  });

  describe('add', () => {
    it('joins and records when', async () => {
      await expect(memberships.add(userId, roomId)).resolves.toBe(true);
      const row = await membershipModel.findOne({ userId, roomId }).lean().exec();
      expect(row?.joinedAt).toBeInstanceOf(Date);
      expect(row).not.toHaveProperty('updatedAt');
    });

    it('returns false when already a member, without a second row', async () => {
      await memberships.add(userId, roomId);
      await expect(memberships.add(userId, roomId)).resolves.toBe(false);
      await expect(membershipModel.countDocuments({ userId, roomId })).resolves.toBe(1);
    });

    it('lets only one of several concurrent joins win', async () => {
      const results = await Promise.all(
        Array.from({ length: 5 }, () => memberships.add(userId, roomId)),
      );
      expect(results.filter(Boolean)).toHaveLength(1);
      await expect(membershipModel.countDocuments({ userId, roomId })).resolves.toBe(1);
    });

    it('lets other users join the same net', async () => {
      await memberships.add(userId, roomId);
      await expect(memberships.add(newId(), roomId)).resolves.toBe(true);
    });
  });

  describe('remove', () => {
    it('leaves, and returns false when there was nothing to leave', async () => {
      await memberships.add(userId, roomId);
      await expect(memberships.remove(userId, roomId)).resolves.toBe(true);
      await expect(memberships.remove(userId, roomId)).resolves.toBe(false);
    });

    it('only removes that user from that net', async () => {
      const otherUser = newId();
      const otherRoom = newId();
      await memberships.add(userId, roomId);
      await memberships.add(userId, otherRoom);
      await memberships.add(otherUser, roomId);

      await memberships.remove(userId, roomId);

      await expect(memberships.isMember(userId, otherRoom)).resolves.toBe(true);
      await expect(memberships.isMember(otherUser, roomId)).resolves.toBe(true);
    });
  });

  describe('isMember', () => {
    it('follows add and remove', async () => {
      await expect(memberships.isMember(userId, roomId)).resolves.toBe(false);
      await memberships.add(userId, roomId);
      await expect(memberships.isMember(userId, roomId)).resolves.toBe(true);
      await memberships.remove(userId, roomId);
      await expect(memberships.isMember(userId, roomId)).resolves.toBe(false);
    });
  });

  describe('roomIdsFor', () => {
    it('lists the user’s nets as ObjectIds, and nothing for a user without nets', async () => {
      const otherRoom = newId();
      await memberships.add(userId, roomId);
      await memberships.add(userId, otherRoom);
      await memberships.add(newId(), newId());

      const ids = await memberships.roomIdsFor(userId);

      expect(ids.every((id) => id instanceof Types.ObjectId)).toBe(true);
      expect(ids.map(String).sort()).toEqual([roomId, otherRoom].sort());
      await expect(memberships.roomIdsFor(newId())).resolves.toEqual([]);
    });

    it('is answered from the index alone (covered query)', async () => {
      await memberships.add(userId, roomId);
      const plan = (await membershipModel
        .find({ userId }, { _id: 0, roomId: 1 })
        .explain('executionStats')) as unknown as { executionStats: { totalDocsExamined: number } };
      expect(plan.executionStats.totalDocsExamined).toBe(0);
    });
  });
});
