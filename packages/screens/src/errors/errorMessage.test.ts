import { ApiClientError } from '@callsign/hooks';
import { describe, expect, it } from 'vitest';

import {
  errorMessage,
  errorMessageForCode,
  errorMessageIfAny,
  leaveErrorMessage,
  sendErrorMessage,
} from './errorMessage';

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

describe('sendErrorMessage', () => {
  it('says seconds, not a minute, for the socket send limit', () => {
    expect(sendErrorMessage('RATE_LIMITED')).toBe(
      'Transmitting too fast. Stand by a few seconds, then retry.',
    );
  });

  it('uses the shared copy for every other code', () => {
    expect(sendErrorMessage('NETWORK_ERROR')).toBe(errorMessageForCode('NETWORK_ERROR'));
    expect(sendErrorMessage('NOT_A_MEMBER')).toBe(errorMessageForCode('NOT_A_MEMBER'));
  });
});

describe('errorMessageForCode', () => {
  it('gives the same copy as errorMessage', () => {
    expect(errorMessageForCode('RATE_LIMITED')).toBe(
      errorMessage(new ApiClientError(429, 'RATE_LIMITED', 'x')),
    );
  });
});

describe('errorMessageIfAny', () => {
  it('is nothing without an error, and the copy with one', () => {
    expect(errorMessageIfAny(null)).toBeUndefined();
    expect(errorMessageIfAny(undefined)).toBeUndefined();
    expect(errorMessageIfAny(new ApiClientError(0, 'NETWORK_ERROR', 'x'))).toBe(
      errorMessageForCode('NETWORK_ERROR'),
    );
  });
});

describe('leaveErrorMessage', () => {
  it('says that leaving failed, then why', () => {
    expect(leaveErrorMessage(null)).toBeUndefined();
    expect(leaveErrorMessage(new ApiClientError(0, 'NETWORK_ERROR', 'x'))).toBe(
      `Could not leave. ${errorMessageForCode('NETWORK_ERROR')}`,
    );
  });
});
