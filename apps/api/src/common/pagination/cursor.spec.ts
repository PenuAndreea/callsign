import type { ApiError } from '@callsign/types';
import { roomNameSchema } from '@callsign/types';
import { z } from 'zod';

import { ApiException } from '../errors/api.exception';
import { decodeCursor, encodeCursor } from './cursor';

const objectIdSchema = z.string().regex(/^[0-9a-f]{24}$/);

/** Decodes and returns the ApiError body it throws. */
function rejectionOf(cursor: string): ApiError {
  try {
    decodeCursor(cursor, roomNameSchema);
  } catch (error) {
    expect(error).toBeInstanceOf(ApiException);
    return (error as ApiException).getResponse() as ApiError;
  }
  throw new Error('expected decodeCursor to throw');
}

describe('encodeCursor / decodeCursor', () => {
  it('round-trips a sort key', () => {
    const cursor = encodeCursor('tower and ground');
    expect(decodeCursor(cursor, roomNameSchema)).toBe('tower and ground');
  });

  it('round-trips non-ASCII text', () => {
    expect(decodeCursor(encodeCursor('tour de contrôle'), roomNameSchema)).toBe('tour de contrôle');
  });

  it('produces a cursor that is safe in a query string', () => {
    const cursor = encodeCursor('??>>~~ net/with+symbols');
    expect(cursor).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(encodeURIComponent(cursor)).toBe(cursor);
  });

  it('checks the decoded key with the given schema', () => {
    const id = '6650c0ffee0000000000abcd';
    expect(decodeCursor(encodeCursor(id), objectIdSchema)).toBe(id);
    expect(() => decodeCursor(encodeCursor('tower'), objectIdSchema)).toThrow(ApiException);
  });
});

describe('decodeCursor rejections', () => {
  it('rejects a key the schema does not allow', () => {
    expect(rejectionOf(encodeCursor('ab'))).toEqual({
      statusCode: 400,
      code: 'VALIDATION_FAILED',
      message: 'cursor: Invalid cursor',
    });
  });

  it.each([
    ['characters outside base64url', 'dG93ZXI='],
    ['a raw name', 'tower and ground'],
    ['a cursor that does not encode back to itself', 'dG93ZXJ'],
    ['bytes that are not UTF-8', Buffer.from([0xff, 0xfe, 0xfd]).toString('base64url')],
  ])('rejects %s', (_, cursor) => {
    expect(rejectionOf(cursor).code).toBe('VALIDATION_FAILED');
  });
});
