import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { callsignSchema, passphraseSchema, roomNameSchema } from '@callsign/types';
import { Connection, Model, Types } from 'mongoose';

import { PasswordHasher } from '../auth/password-hasher.service';
import type { Env } from '../config/env.schema';
import { Membership } from '../memberships/membership.schema';
import { Message } from '../messages/message.schema';
import { Room } from '../rooms/room.schema';
import { RoomsService } from '../rooms/rooms.service';
import { Session } from '../sessions/session.schema';
import { User } from '../users/user.schema';
import { UsersService } from '../users/users.service';
import { buildHistory } from './build-history';
import { SEED_NETS, SEED_PASSPHRASE, SEED_STATIONS } from './seed-data';
import type { SeedNet, SeedSummary } from './seed.types';

/** Every collection the seed owns. All of them are emptied first: the seed always starts clean. */
const SEEDED_MODELS = [User.name, Session.name, Room.name, Membership.name, Message.name];

/**
 * Fills the development database with stations, nets and history. Goes through the same
 * services as the API (hashing, `memberCount`, the last-message preview), except for
 * messages: those are inserted directly, backdated, which `MessagesService.send` cannot do.
 */
@Injectable()
export class Seeder {
  constructor(
    private readonly config: ConfigService<Env, true>,
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(Message.name) private readonly messageModel: Model<Message>,
    private readonly users: UsersService,
    private readonly rooms: RoomsService,
    private readonly hasher: PasswordHasher,
  ) {}

  /** @throws Error in production: the seed deletes every station, net and message. */
  async run(now = new Date()): Promise<SeedSummary> {
    if (this.config.get('NODE_ENV', { infer: true }) === 'production') {
      throw new Error('Refusing to seed: NODE_ENV is production');
    }
    await this.reset();
    const stationIds = await this.createStations();
    const nets = [];
    for (const net of SEED_NETS) {
      nets.push(await this.createNet(net, stationIds, now));
    }
    return { stations: stationIds.size, nets };
  }

  /** Empties the collections and waits for their indexes (a fresh database builds them now). */
  private async reset(): Promise<void> {
    const models = SEEDED_MODELS.map((name) => this.connection.model(name));
    await Promise.all(models.map((model) => model.init()));
    await Promise.all(models.map((model) => model.deleteMany({})));
  }

  private async createStations(): Promise<Map<string, Types.ObjectId>> {
    const passphrase = passphraseSchema.parse(SEED_PASSPHRASE);
    const ids = new Map<string, Types.ObjectId>();
    for (const station of SEED_STATIONS) {
      const user = await this.users.create(
        callsignSchema.parse(station),
        await this.hasher.hash(passphrase),
      );
      ids.set(user.callsign, user._id);
    }
    return ids;
  }

  private async createNet(
    net: SeedNet,
    stationIds: ReadonlyMap<string, Types.ObjectId>,
    now: Date,
  ): Promise<SeedSummary['nets'][number]> {
    const memberNames = [net.createdBy, ...net.members];
    const senders = new Map(memberNames.map((name) => [name, idOf(stationIds, name)]));
    const room = await this.rooms.create(
      idOf(stationIds, net.createdBy).toHexString(),
      roomNameSchema.parse(net.name),
    );
    for (const member of net.members) {
      await this.rooms.join(idOf(stationIds, member).toHexString(), room.id);
    }

    const roomId = new Types.ObjectId(room.id);
    const messages = net.script ? buildHistory({ roomId, script: net.script, senders, now }) : [];
    const newest = messages.at(-1);
    if (newest) {
      // `timestamps: false` keeps the backdated `createdAt` instead of stamping "now".
      await this.messageModel.insertMany(messages, { timestamps: false });
      await this.rooms.recordLastMessage({ ...newest, messageId: newest._id });
    }

    const leaving = net.leaveAfter ?? [];
    for (const station of leaving) {
      await this.rooms.leave(idOf(stationIds, station).toHexString(), room.id);
    }
    return {
      name: room.name,
      members: memberNames.length - leaving.length,
      messages: messages.length,
    };
  }
}

function idOf(stationIds: ReadonlyMap<string, Types.ObjectId>, callsign: string): Types.ObjectId {
  const id = stationIds.get(callsign);
  if (!id) throw new Error(`Seed station "${callsign}" is not in SEED_STATIONS`);
  return id;
}
