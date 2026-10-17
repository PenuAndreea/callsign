import { describe, expect, it } from 'vitest';

import { fromState, redirectTarget } from '../routes/redirectTarget';

describe('redirectTarget', () => {
  it('returns the page kept by RequireAuth', () => {
    expect(redirectTarget(fromState('/nets/abc?tab=1'))).toBe('/nets/abc?tab=1');
  });

  it('falls back to home without usable state', () => {
    expect(redirectTarget(undefined)).toBe('/');
    expect(redirectTarget(null)).toBe('/');
    expect(redirectTarget({ from: 42 })).toBe('/');
  });

  it('never leaves the app (full or protocol-relative URLs)', () => {
    expect(redirectTarget({ from: 'https://evil.test' })).toBe('/');
    expect(redirectTarget({ from: '//evil.test/path' })).toBe('/');
  });
});
