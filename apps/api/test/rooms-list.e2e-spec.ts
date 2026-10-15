import type { INestApplication } from '@nestjs/common';
import type { Page, RoomDto, RoomsQueryInput } from '@callsign/types';
import { PAGE_LIMIT_DEFAULT, roomPageSchema } from '@callsign/types';
import request from 'supertest';
import type { App } from 'supertest/types';

import { encodeCursor } from '../src/common/pagination/cursor';
import { clearDatabase, createTestApp } from './create-test-app';
import { createRoom, stationToken } from './rooms-helpers';

// GET /api/rooms: the joined/open split, isMember, name order and cursor pagination.
describe('Rooms: list (e2e)', () => {
  let app: INestApplication<App>;
  let server: App;
  let wolf: string;
  let eagle: string;

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

  const list = (token: string, query: RoomsQueryInput | Record<string, string>) =>
    request(server).get('/api/rooms').query(query).auth(token, { type: 'bearer' });

  /** Lists one page and checks the body against the shared schema. */
  const page = async (token: string, query: RoomsQueryInput): Promise<Page<RoomDto>> =>
    roomPageSchema.parse((await list(token, query).expect(200)).body);

  const names = (rooms: Page<RoomDto>): string[] => rooms.items.map((room) => room.name);

  /** Follows `nextCursor` until the end; returns every page's names. */
  const allPages = async (token: string, query: RoomsQueryInput): Promise<string[][]> => {
    const pages: string[][] = [];
    let cursor: string | undefined;
    do {
      const current = await page(token, { ...query, cursor });
      pages.push(names(current));
      cursor = current.nextCursor ?? undefined;
    } while (cursor !== undefined);
    return pages;
  };

  it('requires an access token', async () => {
    await request(server).get('/api/rooms').query({ scope: 'open' }).expect(401);
  });

  describe('scopes', () => {
    it('splits nets into joined and open for the user asking, sorted by name', async () => {
      await createRoom(server, wolf, 'tower');
      await createRoom(server, wolf, 'alpha');
      await createRoom(server, eagle, 'ground');

      const joined = await page(wolf, { scope: 'joined' });
      expect(names(joined)).toEqual(['alpha', 'tower']);
      expect(joined.items.every((room) => room.isMember)).toBe(true);

      const open = await page(wolf, { scope: 'open' });
      expect(names(open)).toEqual(['ground']);
      expect(open.items[0]).toMatchObject({ isMember: false, memberCount: 1 });

      // The same net is joined for one station and open for the other.
      expect(names(await page(eagle, { scope: 'open' }))).toEqual(['alpha', 'tower']);
    });

    it('moves a net between scopes on join and leave, and keeps it open with 0 members', async () => {
      const { id } = await createRoom(server, wolf, 'tower');
      expect(names(await page(eagle, { scope: 'open' }))).toEqual(['tower']);

      await request(server).put(`/api/rooms/${id}/members/me`).auth(eagle, { type: 'bearer' });
      expect(names(await page(eagle, { scope: 'joined' }))).toEqual(['tower']);
      expect(names(await page(eagle, { scope: 'open' }))).toEqual([]);

      for (const token of [eagle, wolf]) {
        await request(server).delete(`/api/rooms/${id}/members/me`).auth(token, { type: 'bearer' });
      }
      const open = await page(wolf, { scope: 'open' });
      expect(open.items).toEqual([expect.objectContaining({ name: 'tower', memberCount: 0 })]);
    });

    it('returns an empty last page for a station without nets', async () => {
      await expect(page(wolf, { scope: 'joined' })).resolves.toEqual({
        items: [],
        nextCursor: null,
      });
    });
  });

  describe('pagination', () => {
    it('walks every page in name order, without repeats', async () => {
      for (const name of ['echo', 'alpha', 'delta', 'bravo', 'charlie']) {
        await createRoom(server, wolf, name);
      }
      await expect(allPages(wolf, { scope: 'joined', limit: 2 })).resolves.toEqual([
        ['alpha', 'bravo'],
        ['charlie', 'delta'],
        ['echo'],
      ]);
    });

    it('ends with nextCursor null when the last page is exactly full', async () => {
      await createRoom(server, wolf, 'alpha');
      await createRoom(server, wolf, 'bravo');
      await expect(page(wolf, { scope: 'joined', limit: 2 })).resolves.toMatchObject({
        nextCursor: null,
      });
    });

    it('defaults to 20 per page', async () => {
      for (let i = 0; i <= PAGE_LIMIT_DEFAULT; i += 1) {
        await createRoom(server, wolf, `net-${String(i).padStart(2, '0')}`);
      }
      const first = await page(wolf, { scope: 'joined' });
      expect(first.items).toHaveLength(PAGE_LIMIT_DEFAULT);
      expect(first.nextCursor).not.toBeNull();
    });

    it('stays stable when nets are created between pages', async () => {
      for (const name of ['bravo', 'delta', 'foxtrot']) await createRoom(server, eagle, name);
      const first = await page(wolf, { scope: 'open', limit: 2 });
      expect(names(first)).toEqual(['bravo', 'delta']);

      // One before the cursor (would shift an offset-based page), one after it.
      await createRoom(server, eagle, 'alpha');
      await createRoom(server, eagle, 'echo');

      const second = await page(wolf, { scope: 'open', limit: 2, cursor: first.nextCursor ?? '' });
      expect(names(second)).toEqual(['echo', 'foxtrot']);
    });
  });

  describe('validation', () => {
    it.each([
      ['a missing scope', {}],
      ['an unknown scope', { scope: 'all' }],
      ['a limit above the max', { scope: 'open', limit: '51' }],
      ['a limit that is not a number', { scope: 'open', limit: 'ten' }],
      ['a cursor we did not issue', { scope: 'open', cursor: 'not a cursor' }],
      ['a cursor that is not a net name', { scope: 'open', cursor: encodeCursor('ab') }],
    ])('rejects %s with VALIDATION_FAILED', async (_, query) => {
      const res = await list(wolf, query).expect(400);
      expect(res.body).toMatchObject({ code: 'VALIDATION_FAILED' });
    });
  });
});
