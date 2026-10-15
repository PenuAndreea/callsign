import { HttpException, HttpStatus } from '@nestjs/common';
import type { ApiError, ErrorCode } from '@callsign/types';

import { ApiException } from './api.exception';

/** Codes for exceptions Nest or libraries throw without one (e.g. unknown route, throttler). */
const CODE_BY_STATUS: Partial<Record<number, ErrorCode>> = {
  [HttpStatus.BAD_REQUEST]: 'VALIDATION_FAILED',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.TOO_MANY_REQUESTS]: 'RATE_LIMITED',
};

const INTERNAL: ApiError = {
  statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
  code: 'INTERNAL_ERROR',
  message: 'Internal server error',
};

function messageOf(exception: HttpException): string {
  const response = exception.getResponse();
  if (typeof response === 'string') return response;
  const { message } = response as { message?: unknown };
  if (Array.isArray(message)) return message.join('; ');
  return typeof message === 'string' ? message : exception.message;
}

/**
 * Maps anything thrown during a request to the shared `ApiError` shape.
 * Unknown errors become a generic 500: their message and stack never reach the client.
 */
export function toApiError(exception: unknown): ApiError {
  if (exception instanceof ApiException) {
    return exception.getResponse() as ApiError;
  }
  if (exception instanceof HttpException) {
    const statusCode = exception.getStatus();
    return {
      statusCode,
      code: CODE_BY_STATUS[statusCode] ?? 'INTERNAL_ERROR',
      message: messageOf(exception),
    };
  }
  return INTERNAL;
}
