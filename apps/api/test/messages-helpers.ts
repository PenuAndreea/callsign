import type { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import type { UserDto } from '@callsign/types';
import type { Model } from 'mongoose';
import { Types } from 'mongoose';
import request from 'supertest';
import type { App } from 'supertest/types';

import { Message } from '../src/messages/message.schema';
import { stationToken } from './rooms-helpers';

export interface Station {
  token: string;
  user: UserDto;
}

/** Registers a station and returns its access token and user (the id is needed to seed messages). */
export async function station(server: App, callsign: string): Promise<Station> {
  const token = await stationToken(server, callsign);
  const res = await request(server).get('/api/auth/me').auth(token, { type: 'bearer' }).expect(200);
  return { token, user: res.body as UserDto };
}

/**
 * Inserts messages straight into the database, oldest first, so history can be tested before
 * `message:send` exists. `insertMany` creates the ids in order, so they grow like real ones.
 */
export async function seedMessages(
  app: INestApplication,
  roomId: string,
  sender: UserDto,
  contents: readonly string[],
): Promise<void> {
  const model = app.get<Model<Message>>(getModelToken(Message.name));
  await model.insertMany(
    contents.map((content) => ({
      roomId: new Types.ObjectId(roomId),
      senderId: new Types.ObjectId(sender.id),
      senderCallsign: sender.callsign,
      content,
    })),
  );
}
