import { HttpStatus } from '@nestjs/common';
import type { z } from 'zod';

import { ApiException } from '../errors/api.exception';

const BASE64URL = /^[A-Za-z0-9_-]+$/;

/**
 * Wraps a sort key (a net name, a message id) so clients treat it as opaque and never
 * build cursors themselves. base64url: safe in a query string without escaping.
 */
export function encodeCursor(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

/**
 * Unwraps a cursor from `encodeCursor` and checks the key with `schema`
 * (e.g. a name or an ObjectId), so the service can put it straight into a query.
 * @throws ApiException 400 `VALIDATION_FAILED` for anything we could not have issued.
 */
export function decodeCursor<TSchema extends z.ZodType>(
  cursor: string,
  schema: TSchema,
): z.output<TSchema> {
  // Node's decoder skips characters it does not understand instead of failing,
  // so only accept a cursor that encodes back to exactly the same string.
  const value = BASE64URL.test(cursor) ? Buffer.from(cursor, 'base64url').toString('utf8') : null;
  const parsed = value !== null && encodeCursor(value) === cursor ? schema.safeParse(value) : null;
  if (!parsed?.success) {
    throw new ApiException(HttpStatus.BAD_REQUEST, 'VALIDATION_FAILED', 'cursor: Invalid cursor');
  }
  return parsed.data;
}
