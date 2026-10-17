import type { INestApplication } from '@nestjs/common';
import type { MessageDto, Page } from '@callsign/types';
import { messagePageSchema } from '@callsign/types';
import { Types } from 'mongoose';
import request from 'supertest';
import type { App } from 'supertest/types';

import { encodeCursor } from '../src/common/pagination/cursor';
import { clearDatabase, createTestApp } from './create-test-app';
import type { Station } from './messages-helpers';
import { seedMessages, station } from './messages-helpers';
import { createRoom } from './rooms-helpers';

describe('Messages: GET /api/rooms/:id/messages (e2e)', () => {
  let app: INestApplication<App>;
  let server: App;
  let wolf: Station;
  let eagle: Station;
  let roomId: string;

  beforeEach(async () => {
    app = await createTestApp();
    server = app.getHttpServer();
    wolf = await station(server, 'wolf-2');
    eagle = await station(server, 'eagle-1');
    roomId = (await createRoom(server, wolf.token, 'tower')).id;
  });

  afterEach(async () => {
    await clearDatabase(app);
    await app.close();
  });

  const history = (token: string, id: string, query: Record<string, string | number> = {}) =>
    request(server).get(`/api/rooms/${id}/messages`).auth(token, { type: 'bearer' }).query(query);

  const page = async (query: Record<string, string | number> = {}): Promise<Page<MessageDto>> =>
    messagePageSchema.parse((await history(wolf.token, roomId, query).expect(200)).body);

  it('requires an access token', async () => {
    await request(server).get(`/api/rooms/${roomId}/messages`).expect(401);
  });

  it('returns an empty page for a quiet net', async () => {
    await expect(page()).resolves.toEqual({ items: [], nextCursor: null });
  });

  it('returns messages newest first, with the stored sender callsign', async () => {
    await seedMessages(app, roomId, wolf.user, ['Radio check. Over.', 'Loud and clear. Over.']);
    const { items, nextCursor } = await page();
    expect(items.map((m) => m.content)).toEqual(['Loud and clear. Over.', 'Radio check. Over.']);
    expect(items[0]).toMatchObject({ roomId, sender: { id: wolf.user.id, callsign: 'wolf-2' } });
    expect(nextCursor).toBeNull();
  });

  it('pages through the history without gaps or repeats', async () => {
    const contents = ['1', '2', '3', '4', '5'];
    await seedMessages(app, roomId, wolf.user, contents);

    const seen: string[] = [];
    let cursor: string | null | undefined;
    const sizes: number[] = [];
    do {
      const result = await page(cursor ? { limit: 2, cursor } : { limit: 2 });
      sizes.push(result.items.length);
      seen.push(...result.items.map((m) => m.content));
      cursor = result.nextCursor;
    } while (cursor);

    expect(sizes).toEqual([2, 2, 1]);
    expect(seen).toEqual([...contents].reverse());
  });

  it('has no next page when the last page is exactly full', async () => {
    await seedMessages(app, roomId, wolf.user, ['1', '2']);
    await expect(page({ limit: 2 })).resolves.toMatchObject({ nextCursor: null });
  });

  it("returns only this net's messages", async () => {
    const otherId = (await createRoom(server, wolf.token, 'ground')).id;
    await seedMessages(app, otherId, wolf.user, ['Wrong net. Over.']);
    await seedMessages(app, roomId, wolf.user, ['Right net. Over.']);
    const { items } = await page();
    expect(items.map((m) => m.content)).toEqual(['Right net. Over.']);
  });

  it('shows history to a station that joined later', async () => {
    await seedMessages(app, roomId, wolf.user, ['Before you joined. Over.']);
    await request(server)
      .put(`/api/rooms/${roomId}/members/me`)
      .auth(eagle.token, { type: 'bearer' })
      .expect(200);
    const res = await history(eagle.token, roomId).expect(200);
    expect((res.body as Page<MessageDto>).items).toHaveLength(1);
  });

  describe('access', () => {
    it('refuses a station that is not a member', async () => {
      const res = await history(eagle.token, roomId).expect(403);
      expect(res.body).toMatchObject({ code: 'NOT_A_MEMBER' });
    });

    it('refuses a station that left the net', async () => {
      await request(server)
        .delete(`/api/rooms/${roomId}/members/me`)
        .auth(wolf.token, { type: 'bearer' })
        .expect(204);
      await history(wolf.token, roomId).expect(403);
    });

    it('answers 403 for a well-formed id of a net that does not exist', async () => {
      const res = await history(wolf.token, new Types.ObjectId().toHexString()).expect(403);
      expect(res.body).toMatchObject({ code: 'NOT_A_MEMBER' });
    });

    it('answers 404 for a malformed net id', async () => {
      const res = await history(wolf.token, 'tower').expect(404);
      expect(res.body).toMatchObject({ code: 'NOT_FOUND' });
    });
  });

  describe('validation', () => {
    it.each([
      ['a cursor that is not base64url', { cursor: '!!!' }],
      ['a cursor that does not hold a message id', { cursor: encodeCursor('tower') }],
      ['a limit of 0', { limit: 0 }],
      ['a limit above the maximum', { limit: 51 }],
    ])('rejects %s', async (_case, query) => {
      const res = await history(wolf.token, roomId, query).expect(400);
      expect(res.body).toMatchObject({ code: 'VALIDATION_FAILED' });
    });
  });
});
