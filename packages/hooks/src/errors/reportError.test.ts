import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiClientError } from '../api/ApiClientError';
import type { ErrorReporter } from './reportError';
import { consoleErrorReporter, isUnexpectedError, oncePerError } from './reportError';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('isUnexpectedError', () => {
  it('reports bugs, contract drift and server failures', () => {
    expect(isUnexpectedError(new TypeError('x is undefined'))).toBe(true);
    expect(isUnexpectedError('thrown string')).toBe(true);
    expect(isUnexpectedError(new ApiClientError(200, 'INVALID_RESPONSE', 'bad shape'))).toBe(true);
    expect(isUnexpectedError(new ApiClientError(500, 'INTERNAL_ERROR', 'boom'))).toBe(true);
  });

  it('leaves expected API errors and lost connections to the screens', () => {
    expect(isUnexpectedError(new ApiClientError(0, 'NETWORK_ERROR', 'offline'))).toBe(false);
    expect(isUnexpectedError(new ApiClientError(403, 'NOT_A_MEMBER', 'join first'))).toBe(false);
    expect(isUnexpectedError(new ApiClientError(429, 'RATE_LIMITED', 'slow down'))).toBe(false);
  });
});

describe('consoleErrorReporter', () => {
  it('logs the source, the key and the error', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const error = new TypeError('x is undefined');
    consoleErrorReporter(error, { source: 'query', key: ['nets', 'list'] });
    expect(log).toHaveBeenCalledWith('[callsign] unexpected query error', ['nets', 'list'], error);
  });
});

describe('oncePerError', () => {
  it('reports the same error object once, whatever the source', () => {
    const report = vi.fn<ErrorReporter>();
    const once = oncePerError(report);
    const bug = new TypeError('x is undefined');
    once(bug, { source: 'query', key: ['nets'] });
    once(bug, { source: 'render', componentStack: 'at ChatScreen' });
    once(new TypeError('another bug'), { source: 'render' });
    expect(report).toHaveBeenCalledTimes(2);
    expect(report).toHaveBeenNthCalledWith(1, bug, { source: 'query', key: ['nets'] });
  });

  it('passes primitives through every time', () => {
    const report = vi.fn<ErrorReporter>();
    const once = oncePerError(report);
    once('boom', { source: 'render' });
    once('boom', { source: 'render' });
    expect(report).toHaveBeenCalledTimes(2);
  });
});
