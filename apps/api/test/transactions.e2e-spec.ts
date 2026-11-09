import type { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { Types } from 'mongoose';
import type { App } from 'supertest/types';

import { TransactionRunner } from '../src/common/mongo/transaction-runner';
import { Membership } from '../src/memberships/membership.schema';
import { MembershipsService } from '../src/memberships/memberships.service';
import type { RoomDocument } from '../src/rooms/room.schema';
import { Room } from '../src/rooms/room.schema';
import { RoomsService } from '../src/rooms/rooms.service';
import { clearDatabase, createTestApp } from './create-test-app';

const newId = (): string => new Types.ObjectId().toHexString();

// Transactions against the in-memory replica set: commit, rollback, and the session reaching
// queries in other services on its own (`transactionAsyncLocalStorage`).
describe('Transactions (e2e)', () => {
  let app: INestApplication<App>;
  let transactions: TransactionRunner;
  let memberships: MembershipsService;
  let rooms: RoomsService;
  let roomModel: Model<Room>;
  let membershipModel: Model<Membership>;
  let room: RoomDocument;

  beforeAll(async () => {
    app = await createTestApp();
    transactions = app.get(TransactionRunner);
    memberships = app.get(MembershipsService);
    rooms = app.get(RoomsService);
    roomModel = app.get(getModelToken(Room.name));
    membershipModel = app.get(getModelToken(Membership.name));
  });

  beforeEach(async () => {
    room = await roomModel.create({ name: 'tower', createdBy: newId() });
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await clearDatabase(app);
  });

  afterAll(async () => {
    await app.close();
  });

  const memberCount = async (): Promise<number | undefined> =>
    (await roomModel.findById(room._id).lean().exec())?.memberCount;

  /** Makes the next `$inc` on the room fail, as a crash between the two writes would. */
  const failNextCountUpdate = (): void => {
    const failing = { exec: () => Promise.reject(new Error('count update failed')) };
    jest
      .spyOn(roomModel, 'findByIdAndUpdate')
      .mockReturnValueOnce(failing as unknown as ReturnType<Model<Room>['findByIdAndUpdate']>);
  };

  describe('TransactionRunner', () => {
    it('commits every write of the work', async () => {
      const userId = newId();
      await transactions.run(async () => {
        await memberships.add(userId, room.id);
        await roomModel.updateOne({ _id: room._id }, { $inc: { memberCount: 1 } }).exec();
      });
      await expect(memberships.isMember(userId, room.id)).resolves.toBe(true);
      await expect(memberCount()).resolves.toBe(1);
    });

    it('rolls back every write, also from another service, when the work throws', async () => {
      const userId = newId();
      const failure = new Error('later step failed');
      await expect(
        transactions.run(async () => {
          await memberships.add(userId, room.id);
          await roomModel.updateOne({ _id: room._id }, { $inc: { memberCount: 1 } }).exec();
          throw failure;
        }),
      ).rejects.toBe(failure);
      await expect(memberships.isMember(userId, room.id)).resolves.toBe(false);
      await expect(memberCount()).resolves.toBe(0);
    });
  });

  describe('RoomsService', () => {
    it('join keeps no membership when the count update fails', async () => {
      const userId = newId();
      failNextCountUpdate();
      await expect(rooms.join(userId, room.id)).rejects.toThrow('count update failed');
      await expect(memberships.isMember(userId, room.id)).resolves.toBe(false);
      await expect(memberCount()).resolves.toBe(0);
    });

    it('leave keeps the membership when the count update fails', async () => {
      const userId = newId();
      await rooms.join(userId, room.id);
      failNextCountUpdate();
      await expect(rooms.leave(userId, room.id)).rejects.toThrow('count update failed');
      await expect(memberships.isMember(userId, room.id)).resolves.toBe(true);
      await expect(memberCount()).resolves.toBe(1);
    });

    it('counts one join when the same user joins concurrently', async () => {
      const userId = newId();
      await Promise.all(Array.from({ length: 5 }, () => rooms.join(userId, room.id)));
      await expect(membershipModel.countDocuments({ roomId: room._id })).resolves.toBe(1);
      await expect(memberCount()).resolves.toBe(1);
    });

    it('counts every join when different users join concurrently', async () => {
      await Promise.all(Array.from({ length: 5 }, () => rooms.join(newId(), room.id)));
      await expect(memberCount()).resolves.toBe(5);
    });
  });
});
