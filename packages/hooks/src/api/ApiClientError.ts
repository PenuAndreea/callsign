import type { ErrorCode } from '@callsign/types';
import { apiErrorSchema } from '@callsign/types';

/**
 * The API's codes plus two that only the client can see:
 * - `NETWORK_ERROR`: no answer from the API. Offline, CORS or a refused connection (`status` 0),
 *   or a proxy in front of it saying it is down (502, 503, 504 without an `ApiError` body).
 * - `INVALID_RESPONSE`: a response that does not match the shared schema (contract drift).
 */
export type ClientErrorCode = ErrorCode | 'NETWORK_ERROR' | 'INVALID_RESPONSE';

/** Bad gateway, unavailable, gateway timeout: what a proxy answers when the API behind it is down. */
const GATEWAY_STATUSES = new Set([502, 503, 504]);

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

  /**
   * From a non-2xx response body. A body that is not an `ApiError` did not come from the API:
   * a gateway status means the API is unreachable (the Vite proxy or a load balancer while it is
   * down), anything else is unexpected. Both keep the status.
   */
  static fromResponse(status: number, body: unknown): ApiClientError {
    const parsed = apiErrorSchema.safeParse(body);
    if (parsed.success) return new ApiClientError(status, parsed.data.code, parsed.data.message);
    if (GATEWAY_STATUSES.has(status)) {
      return new ApiClientError(status, 'NETWORK_ERROR', `API unreachable (${status})`);
    }
    return new ApiClientError(status, 'INTERNAL_ERROR', `Unexpected response (${status})`);
  }
}

export function isApiClientError(error: unknown, code?: ClientErrorCode): error is ApiClientError {
  return error instanceof ApiClientError && (code === undefined || error.code === code);
}
