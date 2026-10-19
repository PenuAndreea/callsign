import { describe, expect, it } from 'vitest';

import { ApiClientError } from '../api/ApiClientError';
import { createQueryClient, shouldRetry, throwsToBoundary } from './createQueryClient';

describe('shouldRetry', () => {
  it('retries network errors and 5xx up to twice', () => {
    const offline = new ApiClientError(0, 'NETWORK_ERROR', 'offline');
    const down = new ApiClientError(503, 'INTERNAL_ERROR', 'down');
    expect(shouldRetry(0, offline)).toBe(true);
    expect(shouldRetry(1, down)).toBe(true);
    expect(shouldRetry(2, down)).toBe(false);
  });

  it('never retries a 4xx', () => {
    expect(shouldRetry(0, new ApiClientError(403, 'NOT_A_MEMBER', 'join first'))).toBe(false);
    expect(shouldRetry(0, new ApiClientError(401, 'UNAUTHORIZED', 'signed out'))).toBe(false);
  });

  it('never retries an unknown error (a bug, not a hiccup)', () => {
    expect(shouldRetry(0, new TypeError('x is undefined'))).toBe(false);
  });
});

describe('throwsToBoundary', () => {
  it('sends bugs to the error boundary', () => {
    expect(throwsToBoundary(new TypeError('x is undefined'))).toBe(true);
    expect(throwsToBoundary('thrown string')).toBe(true);
  });

  it('keeps every API error inline, even a server failure or a broken response', () => {
    expect(throwsToBoundary(new ApiClientError(0, 'NETWORK_ERROR', 'offline'))).toBe(false);
    expect(throwsToBoundary(new ApiClientError(500, 'INTERNAL_ERROR', 'boom'))).toBe(false);
    expect(throwsToBoundary(new ApiClientError(200, 'INVALID_RESPONSE', 'bad shape'))).toBe(false);
  });
});

describe('createQueryClient', () => {
  it('uses the retry and boundary rules for queries and never retries mutations', () => {
    const defaults = createQueryClient().getDefaultOptions();
    expect(defaults.queries?.retry).toBe(shouldRetry);
    expect(defaults.queries?.throwOnError).toBe(throwsToBoundary);
    expect(defaults.mutations?.retry).toBe(false);
  });
});
