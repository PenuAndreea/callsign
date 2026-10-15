import { describe, expect, it } from 'vitest';

import { apiErrorSchema, errorCodeSchema } from '../common';

describe('errorCodeSchema', () => {
  it('exposes the codes as runtime values', () => {
    expect(errorCodeSchema.enum.CALLSIGN_TAKEN).toBe('CALLSIGN_TAKEN');
  });
});

describe('apiErrorSchema', () => {
  it('accepts a valid error', () => {
    const error = { statusCode: 409, code: 'CALLSIGN_TAKEN', message: 'Callsign taken' };
    expect(apiErrorSchema.parse(error)).toEqual(error);
  });

  it('rejects an unknown code', () => {
    const error = { statusCode: 418, code: 'TEAPOT', message: 'No' };
    expect(apiErrorSchema.safeParse(error).success).toBe(false);
  });

  it('rejects a non-integer status code', () => {
    const error = { statusCode: 400.5, code: 'VALIDATION_FAILED', message: 'Bad' };
    expect(apiErrorSchema.safeParse(error).success).toBe(false);
  });
});
