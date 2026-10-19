import { ConfigService } from '@nestjs/config';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { Connection, Model } from 'mongoose';

import { PasswordHasher } from '../src/auth/password-hasher.service';
import { Membership } from '../src/memberships/membership.schema';
import { Message } from '../src/messages/message.schema';
import { Room } from '../src/rooms/room.schema';
import { SEED_NETS, SEED_PASSPHRASE, SEED_STATIONS } from '../src/seed/seed-data';
import { SeedModule } from '../src/seed/seed.module';
import { Seeder } from '../src/seed/seeder.service';
import { Session } from '../src/sessions/session.schema';
import { User } from '../src/users/user.schema';

// The seed against a real MongoDB: the denormalized fields it relies on the services for
// (`memberCount`, `lastMessage`) only mean something when checked against the stored rows.
describe('Seeder (Mongo)', () => {
  let moduleRef: TestingModule;
  let seeder: Seeder;
  let model: <T>(name: string) => Model<T>;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({ imports: [SeedModule] }).compile();
    seeder = moduleRef.get(Seeder);
    model = <T>(name: string) => moduleRef.get<Model<T>>(getModelToken(name));
  });

  afterAll(async () => {
    await moduleRef.get<Connection>(getConnectionToken()).dropDatabase();
    await moduleRef.close();
  });

  it('writes every station and net, and wipes what was there', async () => {
    await model<Session>(Session.name).collection.insertOne({ tokenHash: 'stale' });
    const summary = await seeder.run();

    expect(summary.stations).toBe(SEED_STATIONS.length);
    expect(summary.nets.map((net) => net.name)).toEqual(SEED_NETS.map((net) => net.name));
    expect(await model<User>(User.name).countDocuments()).toBe(SEED_STATIONS.length);
    expect(await model<Room>(Room.name).countDocuments()).toBe(SEED_NETS.length);
    expect(await model<Session>(Session.name).countDocuments()).toBe(0);
    const total = summary.nets.reduce((sum, net) => sum + net.messages, 0);
    expect(await model<Message>(Message.name).countDocuments()).toBe(total);
  });

  it('gives the same result when run again', async () => {
    const first = await seeder.run();
    const second = await seeder.run();
    expect(second).toEqual(first);
    expect(await model<User>(User.name).countDocuments()).toBe(SEED_STATIONS.length);
  });

  it('keeps memberCount and the preview in line with the stored rows', async () => {
    const summary = await seeder.run();
    const rooms = await model<Room>(Room.name).find().exec();
    for (const room of rooms) {
      const members = await model<Membership>(Membership.name).countDocuments({ roomId: room._id });
      expect(room.memberCount).toBe(members);
      expect(summary.nets.find((net) => net.name === room.name)?.members).toBe(members);

      const newest = await model<Message>(Message.name)
        .findOne({ roomId: room._id })
        .sort({ _id: -1 })
        .exec();
      if (newest) {
        expect(room.lastMessage?.messageId.equals(newest._id)).toBe(true);
        expect(room.lastMessage?.createdAt).toEqual(newest.createdAt);
      } else {
        expect(room.lastMessage).toBeNull();
      }
    }
  });

  it('keeps the backdated times and the 0-member net with its history', async () => {
    const started = Date.now();
    const summary = await seeder.run();
    const oldest = await model<Message>(Message.name).findOne().sort({ _id: 1 }).exec();
    if (!oldest) throw new Error('no messages seeded');
    expect(oldest.createdAt.getTime()).toBeLessThan(started - 4 * 24 * 3600 * 1000);
    expect(oldest._id.getTimestamp().getTime()).toBe(oldest.createdAt.getTime());

    const nightShift = await model<Room>(Room.name).findOne({ name: 'night shift' }).exec();
    if (!nightShift) throw new Error('night shift not seeded');
    expect(nightShift.memberCount).toBe(0);
    const history = await model<Message>(Message.name).countDocuments({ roomId: nightShift._id });
    expect(history).toBeGreaterThan(0);
    expect(summary.nets.find((net) => net.name === 'night shift')?.messages).toBe(history);
  });

  it('stores a hash the seed passphrase verifies', async () => {
    await seeder.run();
    const wolf = await model<User>(User.name)
      .findOne({ callsign: 'wolf-2' })
      .select('+passwordHash')
      .exec();
    expect(await moduleRef.get(PasswordHasher).verify(wolf?.passwordHash, SEED_PASSPHRASE)).toBe(
      true,
    );
  });

  it('refuses to run in production', async () => {
    const production = await Test.createTestingModule({ imports: [SeedModule] })
      .overrideProvider(ConfigService)
      .useValue({
        get: (key: string) => (key === 'NODE_ENV' ? 'production' : process.env[key]),
      })
      .compile();
    await expect(production.get(Seeder).run()).rejects.toThrow(/production/);
    await production.close();
  });
});
