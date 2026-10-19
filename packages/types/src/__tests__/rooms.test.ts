import { describe, expect, it } from 'vitest';

import { PAGE_LIMIT_DEFAULT } from '../common';
import {
  createRoomRequestSchema,
  roomDtoSchema,
  roomNameSchema,
  roomPageSchema,
  roomsQuerySchema,
} from '../rooms';

const room = {
  id: '6650c0ffee0000000000abcd',
  name: 'tower',
  memberCount: 2,
  isMember: true,
  lastMessage: { content: 'Radio check. Over.', createdAt: '2026-10-15T22:14:00.000Z' },
  createdAt: '2026-10-15T20:00:00.000Z',
};

describe('roomNameSchema', () => {
  it('trims and lowercases the name', () => {
    expect(roomNameSchema.parse('  Tower ')).toBe('tower');
  });

  it('accepts 3 and 30 characters', () => {
    expect(roomNameSchema.safeParse('abc').success).toBe(true);
    expect(roomNameSchema.safeParse('a'.repeat(30)).success).toBe(true);
  });

  it('rejects fewer than 3 or more than 30 characters', () => {
    expect(roomNameSchema.safeParse('ab').success).toBe(false);
    expect(roomNameSchema.safeParse('a'.repeat(31)).success).toBe(false);
  });

  it('checks the length after trimming', () => {
    expect(roomNameSchema.safeParse('  ab  ').success).toBe(false);
  });
});

describe('createRoomRequestSchema', () => {
  it('normalizes the name', () => {
    expect(createRoomRequestSchema.parse({ name: ' Tower And Ground ' })).toEqual({
      name: 'tower and ground',
    });
  });

  it('rejects a missing name', () => {
    expect(createRoomRequestSchema.safeParse({}).success).toBe(false);
  });
});

describe('roomsQuerySchema', () => {
  it('parses scope, cursor and a coerced limit', () => {
    expect(roomsQuerySchema.parse({ scope: 'open', cursor: 'abc', limit: '10' })).toEqual({
      scope: 'open',
      cursor: 'abc',
      limit: 10,
    });
  });

  it('defaults the limit', () => {
    expect(roomsQuerySchema.parse({ scope: 'joined' })).toEqual({
      scope: 'joined',
      limit: PAGE_LIMIT_DEFAULT,
    });
  });

  it('requires a known scope', () => {
    expect(roomsQuerySchema.safeParse({}).success).toBe(false);
    expect(roomsQuerySchema.safeParse({ scope: 'all' }).success).toBe(false);
  });
});

describe('roomDtoSchema', () => {
  it('accepts a room with and without a last message', () => {
    expect(roomDtoSchema.parse(room)).toEqual(room);
    expect(roomDtoSchema.safeParse({ ...room, lastMessage: null }).success).toBe(true);
  });

  it('rejects a negative or fractional member count', () => {
    expect(roomDtoSchema.safeParse({ ...room, memberCount: -1 }).success).toBe(false);
    expect(roomDtoSchema.safeParse({ ...room, memberCount: 1.5 }).success).toBe(false);
  });

  it('rejects a date that is not ISO 8601', () => {
    expect(roomDtoSchema.safeParse({ ...room, createdAt: 'yesterday' }).success).toBe(false);
  });
});

describe('roomPageSchema', () => {
  it('accepts a page of rooms', () => {
    const page = { items: [room], nextCursor: null };
    expect(roomPageSchema.parse(page)).toEqual(page);
  });
});

describe('roomNameSchema messages', () => {
  it('gives the length rule', () => {
    expect(roomNameSchema.safeParse('ab').error?.issues[0]?.message).toBe('At least 3 characters');
    expect(roomNameSchema.safeParse('a'.repeat(31)).error?.issues[0]?.message).toBe(
      'At most 30 characters',
    );
  });
});
