import { describe, expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';

import type { Page } from '../common';
import {
  apiErrorSchema,
  errorCodeSchema,
  PAGE_LIMIT_DEFAULT,
  PAGE_LIMIT_MAX,
  pageQuerySchema,
  pageSchema,
} from '../common';

describe('pageQuerySchema', () => {
  it('defaults the limit when it is missing', () => {
    expect(pageQuerySchema.parse({})).toEqual({ limit: PAGE_LIMIT_DEFAULT });
  });

  it('coerces a query-string limit to a number', () => {
    expect(pageQuerySchema.parse({ cursor: 'abc', limit: '5' })).toEqual({
      cursor: 'abc',
      limit: 5,
    });
  });

  it('accepts 1 and the maximum', () => {
    expect(pageQuerySchema.safeParse({ limit: '1' }).success).toBe(true);
    expect(pageQuerySchema.safeParse({ limit: String(PAGE_LIMIT_MAX) }).success).toBe(true);
  });

  it.each(['0', String(PAGE_LIMIT_MAX + 1), '2.5', 'abc', ''])('rejects limit %j', (limit) => {
    expect(pageQuerySchema.safeParse({ limit }).success).toBe(false);
  });

  it('rejects a repeated limit (array) that does not coerce to one number', () => {
    expect(pageQuerySchema.safeParse({ limit: ['5', '10'] }).success).toBe(false);
  });

  it('rejects an empty or repeated cursor', () => {
    expect(pageQuerySchema.safeParse({ cursor: '' }).success).toBe(false);
    expect(pageQuerySchema.safeParse({ cursor: ['a', 'b'] }).success).toBe(false);
  });

  it('rejects a cursor longer than 200 characters', () => {
    expect(pageQuerySchema.safeParse({ cursor: 'a'.repeat(201) }).success).toBe(false);
  });
});

describe('pageSchema', () => {
  const numberPage = pageSchema(z.number());

  it('accepts a page with a next cursor or with null', () => {
    expect(numberPage.parse({ items: [1, 2], nextCursor: 'abc' })).toEqual({
      items: [1, 2],
      nextCursor: 'abc',
    });
    expect(numberPage.safeParse({ items: [], nextCursor: null }).success).toBe(true);
  });

  it('validates every item', () => {
    expect(numberPage.safeParse({ items: [1, 'two'], nextCursor: null }).success).toBe(false);
  });

  it('requires nextCursor (null, not missing, ends the list)', () => {
    expect(numberPage.safeParse({ items: [] }).success).toBe(false);
  });

  it('infers Page<T>', () => {
    expectTypeOf<z.infer<typeof numberPage>>().toEqualTypeOf<Page<number>>();
    expectTypeOf<Page<number>>().toEqualTypeOf<{ items: number[]; nextCursor: string | null }>();
  });
});

describe('errorCodeSchema', () => {
  it('exposes the codes as runtime values', () => {
    expect(errorCodeSchema.enum.CALLSIGN_TAKEN).toBe('CALLSIGN_TAKEN');
  });
});

describe('apiErrorSchema', () => {
  it('accepts a valid error', () => {
    const error = { statusCode: 409, code: 'CALLSIGN_TAKEN', message: 'Callsign taken' };
    expect(apiErrorSchema.parse(error)).toEqual(error);
  });

  it('rejects an unknown code', () => {
    const error = { statusCode: 418, code: 'TEAPOT', message: 'No' };
    expect(apiErrorSchema.safeParse(error).success).toBe(false);
  });

  it('rejects a non-integer status code', () => {
    const error = { statusCode: 400.5, code: 'VALIDATION_FAILED', message: 'Bad' };
    expect(apiErrorSchema.safeParse(error).success).toBe(false);
  });
});
