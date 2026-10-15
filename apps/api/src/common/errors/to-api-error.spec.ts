import { BadRequestException, HttpException, NotFoundException } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';

import { ApiException } from './api.exception';
import { toApiError } from './to-api-error';

describe('toApiError', () => {
  it('passes an ApiException through unchanged', () => {
    const error = new ApiException(409, 'CALLSIGN_TAKEN', 'Callsign taken');
    expect(toApiError(error)).toEqual({
      statusCode: 409,
      code: 'CALLSIGN_TAKEN',
      message: 'Callsign taken',
    });
  });

  it('gives Nest exceptions a code from their status', () => {
    expect(toApiError(new NotFoundException('Cannot GET /api/nope'))).toEqual({
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Cannot GET /api/nope',
    });
    expect(toApiError(new BadRequestException(['a is required', 'b is required']))).toEqual({
      statusCode: 400,
      code: 'VALIDATION_FAILED',
      message: 'a is required; b is required',
    });
  });

  it('maps the throttler to RATE_LIMITED', () => {
    expect(toApiError(new ThrottlerException('Too many requests'))).toEqual({
      statusCode: 429,
      code: 'RATE_LIMITED',
      message: 'Too many requests',
    });
  });

  it('keeps the status of an HttpException without a code of its own', () => {
    expect(toApiError(new HttpException('Database unavailable', 503))).toEqual({
      statusCode: 503,
      code: 'INTERNAL_ERROR',
      message: 'Database unavailable',
    });
  });

  it('hides unknown errors behind a generic 500', () => {
    expect(toApiError(new Error('connection string mongodb://secret@host'))).toEqual({
      statusCode: 500,
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
    });
  });
});
