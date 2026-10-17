import type { Logger } from '@nestjs/common';
import type { ApiError } from '@callsign/types';

import { toApiError } from './to-api-error';

/**
 * `toApiError`, plus the full details in the server log for anything unexpected (5xx).
 * Shared by every place that answers a client with an error: HTTP filter, socket handshake, acks.
 */
export function toLoggedApiError(exception: unknown, logger: Logger): ApiError {
  const apiError = toApiError(exception);
  if (apiError.statusCode >= 500) {
    logger.error(exception instanceof Error ? (exception.stack ?? exception.message) : exception);
  }
  return apiError;
}
