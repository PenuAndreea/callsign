import { describe, expect, it } from 'vitest';

import { ApiClientError } from '../api/ApiClientError';
import { createQueryClient, shouldRetry } from './createQueryClient';

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

describe('createQueryClient', () => {
  it('uses the retry rule for queries and never retries mutations', () => {
    const defaults = createQueryClient().getDefaultOptions();
    expect(defaults.queries?.retry).toBe(shouldRetry);
    expect(defaults.mutations?.retry).toBe(false);
  });
});
