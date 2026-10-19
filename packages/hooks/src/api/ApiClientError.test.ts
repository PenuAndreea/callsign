import { describe, expect, it } from 'vitest';

import { ApiClientError, isApiClientError } from './ApiClientError';

describe('ApiClientError.fromResponse', () => {
  it('takes code and message from an ApiError body', () => {
    const error = ApiClientError.fromResponse(409, {
      statusCode: 409,
      code: 'CALLSIGN_TAKEN',
      message: 'Callsign is already taken',
    });
    expect(error).toMatchObject({
      status: 409,
      code: 'CALLSIGN_TAKEN',
      message: 'Callsign is already taken',
      name: 'ApiClientError',
    });
  });

  it('falls back to INTERNAL_ERROR for an unknown code', () => {
    const error = ApiClientError.fromResponse(418, {
      statusCode: 418,
      code: 'TEAPOT',
      message: '',
    });
    expect(error).toMatchObject({ status: 418, code: 'INTERNAL_ERROR' });
  });

  it('treats a gateway status without an ApiError body as the API being unreachable', () => {
    for (const status of [502, 503, 504]) {
      const error = ApiClientError.fromResponse(status, '<html>Bad Gateway</html>');
      expect(error).toMatchObject({ status, code: 'NETWORK_ERROR' });
    }
  });

  it("keeps the API's own 503 (health check without a database)", () => {
    const error = ApiClientError.fromResponse(503, {
      statusCode: 503,
      code: 'INTERNAL_ERROR',
      message: 'Database unavailable',
    });
    expect(error).toMatchObject({ status: 503, code: 'INTERNAL_ERROR' });
  });

  it('keeps any other non-ApiError body as INTERNAL_ERROR', () => {
    const error = ApiClientError.fromResponse(500, 'Internal Server Error');
    expect(error).toMatchObject({ status: 500, code: 'INTERNAL_ERROR' });
  });
});

describe('isApiClientError', () => {
  const error = new ApiClientError(403, 'NOT_A_MEMBER', 'Join the net first');

  it('narrows by class and optionally by code', () => {
    expect(isApiClientError(error)).toBe(true);
    expect(isApiClientError(error, 'NOT_A_MEMBER')).toBe(true);
    expect(isApiClientError(error, 'NOT_FOUND')).toBe(false);
  });

  it('is false for other errors', () => {
    expect(isApiClientError(new Error('NOT_A_MEMBER'))).toBe(false);
    expect(isApiClientError({ code: 'NOT_A_MEMBER' })).toBe(false);
  });
});
