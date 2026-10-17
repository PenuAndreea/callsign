import type { ErrorCode } from '@callsign/types';
import { apiErrorSchema } from '@callsign/types';

/**
 * The API's codes plus two that only the client can see:
 * - `NETWORK_ERROR`: no response at all (offline, API down, CORS). `status` is 0.
 * - `INVALID_RESPONSE`: a response that does not match the shared schema (contract drift).
 */
export type ClientErrorCode = ErrorCode | 'NETWORK_ERROR' | 'INVALID_RESPONSE';

/** Every failed API call rejects with this, so screens map `code` to copy in one place. */
export class ApiClientError extends Error {
  override readonly name = 'ApiClientError';

  constructor(
    readonly status: number,
    readonly code: ClientErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
  }

  /** From a non-2xx response body. A body that is not an `ApiError` (a proxy page) keeps the status. */
  static fromResponse(status: number, body: unknown): ApiClientError {
    const parsed = apiErrorSchema.safeParse(body);
    if (parsed.success) return new ApiClientError(status, parsed.data.code, parsed.data.message);
    return new ApiClientError(status, 'INTERNAL_ERROR', `Unexpected response (${status})`);
  }
}

export function isApiClientError(error: unknown, code?: ClientErrorCode): error is ApiClientError {
  return error instanceof ApiClientError && (code === undefined || error.code === code);
}
