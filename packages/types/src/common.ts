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
]);

export type ErrorCode = z.infer<typeof errorCodeSchema>;

/** Shape of every error response. */
export const apiErrorSchema = z.object({
  statusCode: z.number().int(),
  code: errorCodeSchema,
  message: z.string(),
});

export type ApiError = z.infer<typeof apiErrorSchema>;
