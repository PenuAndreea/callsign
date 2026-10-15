import type { ApiError } from '@callsign/types';
import { loginRequestSchema } from '@callsign/types';

import { ApiException } from '../errors/api.exception';
import { ZodValidationPipe } from './zod-validation.pipe';

const pipe = new ZodValidationPipe(loginRequestSchema);

/** Runs the pipe and returns the ApiError body it throws. */
function rejectionOf(value: unknown): ApiError {
  try {
    pipe.transform(value);
  } catch (error) {
    expect(error).toBeInstanceOf(ApiException);
    return (error as ApiException).getResponse() as ApiError;
  }
  throw new Error('expected the pipe to throw');
}

describe('ZodValidationPipe', () => {
  it('returns the parsed, normalized value', () => {
    expect(pipe.transform({ callsign: '  WOLF-2 ', passphrase: 'secret12' })).toEqual({
      callsign: 'wolf-2',
      passphrase: 'secret12',
    });
  });

  it('throws VALIDATION_FAILED naming each failing field', () => {
    const body = rejectionOf({ callsign: 'ab' });
    expect(body).toMatchObject({ statusCode: 400, code: 'VALIDATION_FAILED' });
    expect(body.message).toMatch(/callsign: .*; passphrase: /);
  });

  it('never echoes the input in the message', () => {
    const secret = 'x'.repeat(200);
    expect(rejectionOf({ callsign: 'wolf-2', passphrase: secret }).message).not.toContain(secret);
  });
});
