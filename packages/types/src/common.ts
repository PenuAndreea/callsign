import { z } from 'zod';

/** Stable error codes; the apps map them to copy. */
export const errorCodeSchema = z.enum([
  'VALIDATION_FAILED',
  'INVALID_CREDENTIALS',
  'UNAUTHORIZED',
  'NOT_A_MEMBER',
  'NOT_FOUND',
  'CALLSIGN_TAKEN',
  'NET_NAME_TAKEN',
  'RATE_LIMITED',
  // Anything unexpected (500, or a status with no code of its own). Details stay in the server log.
  'INTERNAL_ERROR',
]);

export type ErrorCode = z.infer<typeof errorCodeSchema>;

/** Shape of every error response. */
export const apiErrorSchema = z.object({
  statusCode: z.number().int(),
  code: errorCodeSchema,
  message: z.string(),
});

export type ApiError = z.infer<typeof apiErrorSchema>;

export const PAGE_LIMIT_DEFAULT = 20;
export const PAGE_LIMIT_MAX = 50;

/**
 * `?cursor&limit` on every list endpoint. Query strings are text, so `limit` is coerced
 * (`'20'` → `20`) and then checked; out-of-range values are rejected, not clamped.
 * The cursor is opaque to clients: send back the `nextCursor` of the previous page.
 */
export const pageQuerySchema = z.object({
  cursor: z.string().min(1).max(200).optional(),
  limit: z.coerce.number().int().min(1).max(PAGE_LIMIT_MAX).default(PAGE_LIMIT_DEFAULT),
});

/** Parsed query, as the API sees it (`limit` always set). */
export type PageQuery = z.infer<typeof pageQuerySchema>;

/** What a client may send (`limit` optional). */
export type PageQueryInput = z.input<typeof pageQuerySchema>;

/** One page of a list. `nextCursor: null` means there are no more pages. */
export function pageSchema<T extends z.ZodType>(item: T) {
  return z.object({
    items: z.array(item),
    nextCursor: z.string().nullable(),
  });
}

export type Page<T> = z.infer<ReturnType<typeof pageSchema<z.ZodType<T>>>>;
