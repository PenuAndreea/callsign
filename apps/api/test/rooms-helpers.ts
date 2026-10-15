import type { RoomDto } from '@callsign/types';
import request from 'supertest';
import type { App } from 'supertest/types';

import { register } from './auth-helpers';

/** Registers a station and returns its access token. */
export async function stationToken(server: App, callsign: string): Promise<string> {
  const { body } = await register(server, 'mobile', { callsign, passphrase: 'correct horse' });
  return body.accessToken;
}

/** Creates a net through the API (the creator joins it) and returns the parsed body. */
export async function createRoom(server: App, token: string, name: string): Promise<RoomDto> {
  const res = await request(server)
    .post('/api/rooms')
    .auth(token, { type: 'bearer' })
    .send({ name })
    .expect(201);
  return res.body as RoomDto;
}
