import { ApiClientError } from '@callsign/hooks';
import { describe, expect, it } from 'vitest';

import { errorMessage } from './errorMessage';

describe('errorMessage', () => {
  it('maps API codes to copy', () => {
    expect(errorMessage(new ApiClientError(401, 'INVALID_CREDENTIALS', 'x'))).toBe(
      'Callsign or passphrase not recognised.',
    );
    expect(errorMessage(new ApiClientError(429, 'RATE_LIMITED', 'x'))).toMatch(/Stand by/);
  });

  it('maps client-only codes to copy', () => {
    expect(errorMessage(new ApiClientError(0, 'NETWORK_ERROR', 'x'))).toBe(
      'No contact with the net. Check your connection.',
    );
  });

  it('never shows details of an unknown error', () => {
    expect(errorMessage(new TypeError('cannot read x of undefined'))).toBe(
      'Something went wrong. Try again.',
    );
  });
});
