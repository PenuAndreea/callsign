import type { INestApplication } from '@nestjs/common';
import type { RoomDto } from '@callsign/types';
import { roomDtoSchema } from '@callsign/types';
import { Types } from 'mongoose';
import request from 'supertest';
import type { App } from 'supertest/types';

import { clearDatabase, createTestApp } from './create-test-app';
import { createRoom, stationToken } from './rooms-helpers';

// Create, read, join, leave. Listing (scopes, pagination) is in rooms-list.e2e-spec.ts.
describe('Rooms: create, get, join, leave (e2e)', () => {
  let app: INestApplication<App>;
  let server: App;
  let wolf: string;
  let eagle: string;

  // A fresh app per test: a fresh throttler too, so the 10/min register limit never interferes.
  beforeEach(async () => {
    app = await createTestApp();
    server = app.getHttpServer();
    wolf = await stationToken(server, 'wolf-2');
    eagle = await stationToken(server, 'eagle-1');
  });

  afterEach(async () => {
    await clearDatabase(app);
    await app.close();
  });

  const getRoom = async (token: string, id: string): Promise<RoomDto> =>
    (await request(server).get(`/api/rooms/${id}`).auth(token, { type: 'bearer' }).expect(200))
      .body as RoomDto;

  const join = (token: string, id: string) =>
    request(server).put(`/api/rooms/${id}/members/me`).auth(token, { type: 'bearer' });

  const leave = (token: string, id: string) =>
    request(server).delete(`/api/rooms/${id}/members/me`).auth(token, { type: 'bearer' });

  const unknownId = new Types.ObjectId().toHexString();

  it('requires an access token on every route', async () => {
    const id = unknownId;
    await request(server).post('/api/rooms').send({ name: 'tower' }).expect(401);
    await request(server).get(`/api/rooms/${id}`).expect(401);
    await request(server).put(`/api/rooms/${id}/members/me`).expect(401);
    await request(server).delete(`/api/rooms/${id}/members/me`).expect(401);
  });

  describe('POST /api/rooms', () => {
    it('creates the net, normalizes the name and joins the creator', async () => {
      const room = await createRoom(server, wolf, '  Tower And Ground ');
      expect(roomDtoSchema.parse(room)).toMatchObject({
        name: 'tower and ground',
        memberCount: 1,
        isMember: true,
        lastMessage: null,
      });
      await expect(getRoom(wolf, room.id)).resolves.toMatchObject({ isMember: true });
    });

    it('rejects a taken name, case-insensitively', async () => {
      await createRoom(server, wolf, 'tower');
      const res = await request(server)
        .post('/api/rooms')
        .auth(eagle, { type: 'bearer' })
        .send({ name: ' TOWER ' })
        .expect(409);
      expect(res.body).toMatchObject({ code: 'NET_NAME_TAKEN' });
    });

    it('lets only one of two concurrent creates win', async () => {
      const statuses = await Promise.all(
        [wolf, eagle].map(
          async (token) =>
            (
              await request(server)
                .post('/api/rooms')
                .auth(token, { type: 'bearer' })
                .send({ name: 'tower' })
            ).status,
        ),
      );
      expect(statuses.sort()).toEqual([201, 409]);
    });

    it('rejects an invalid name with VALIDATION_FAILED', async () => {
      const res = await request(server)
        .post('/api/rooms')
        .auth(wolf, { type: 'bearer' })
        .send({ name: 'ab' })
        .expect(400);
      expect(res.body).toMatchObject({ code: 'VALIDATION_FAILED' });
      expect((res.body as { message: string }).message).toMatch(/^name: /);
    });
  });

  describe('GET /api/rooms/:id', () => {
    it('reports isMember for the user asking', async () => {
      const { id } = await createRoom(server, wolf, 'tower');
      await expect(getRoom(wolf, id)).resolves.toMatchObject({ isMember: true });
      await expect(getRoom(eagle, id)).resolves.toMatchObject({ isMember: false, memberCount: 1 });
    });

    it.each([
      ['an unknown id', unknownId],
      ['a malformed id', 'not-an-id'],
    ])('returns 404 NOT_FOUND for %s', async (_, id) => {
      const res = await request(server)
        .get(`/api/rooms/${id}`)
        .auth(wolf, { type: 'bearer' })
        .expect(404);
      expect(res.body).toMatchObject({ code: 'NOT_FOUND' });
    });
  });

  describe('PUT /api/rooms/:id/members/me (join)', () => {
    it('joins and counts the new member', async () => {
      const { id } = await createRoom(server, wolf, 'tower');
      const res = await join(eagle, id).expect(200);
      expect(res.body).toMatchObject({ id, memberCount: 2, isMember: true });
    });

    it('is idempotent: joining twice counts once', async () => {
      const { id } = await createRoom(server, wolf, 'tower');
      await join(eagle, id).expect(200);
      const res = await join(eagle, id).expect(200);
      expect(res.body).toMatchObject({ memberCount: 2, isMember: true });
    });

    it('counts concurrent joins by the same user once', async () => {
      const { id } = await createRoom(server, wolf, 'tower');
      await Promise.all(Array.from({ length: 5 }, () => join(eagle, id).expect(200)));
      await expect(getRoom(wolf, id)).resolves.toMatchObject({ memberCount: 2 });
    });

    it('returns 404 NOT_FOUND for an unknown net', async () => {
      const res = await join(wolf, unknownId).expect(404);
      expect(res.body).toMatchObject({ code: 'NOT_FOUND' });
    });
  });

  describe('DELETE /api/rooms/:id/members/me (leave)', () => {
    it('leaves and uncounts the member', async () => {
      const { id } = await createRoom(server, wolf, 'tower');
      await join(eagle, id).expect(200);
      await leave(eagle, id).expect(204);
      await expect(getRoom(eagle, id)).resolves.toMatchObject({ memberCount: 1, isMember: false });
    });

    it('is idempotent: leaving twice, or a net you never joined, changes nothing', async () => {
      const { id } = await createRoom(server, wolf, 'tower');
      await leave(eagle, id).expect(204);
      await join(eagle, id).expect(200);
      await leave(eagle, id).expect(204);
      await leave(eagle, id).expect(204);
      await expect(getRoom(wolf, id)).resolves.toMatchObject({ memberCount: 1 });
    });

    it('keeps the net when the last member leaves, and it can be joined again', async () => {
      const { id } = await createRoom(server, wolf, 'tower');
      await leave(wolf, id).expect(204);
      await expect(getRoom(wolf, id)).resolves.toMatchObject({ memberCount: 0, isMember: false });
      const res = await join(eagle, id).expect(200);
      expect(res.body).toMatchObject({ memberCount: 1, isMember: true });
    });

    it('returns 404 NOT_FOUND for an unknown net', async () => {
      const res = await leave(wolf, unknownId).expect(404);
      expect(res.body).toMatchObject({ code: 'NOT_FOUND' });
    });
  });
});
