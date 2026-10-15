import { describe, expect, it } from 'vitest';

import { formatZulu } from './formatZulu';

describe('formatZulu', () => {
  it('formats UTC hours and minutes with a Z suffix', () => {
    expect(formatZulu(new Date('2026-10-15T22:14:59Z'))).toBe('22:14Z');
  });

  it('zero-pads single digits', () => {
    expect(formatZulu(new Date('2026-10-15T03:07:00Z'))).toBe('03:07Z');
  });

  it('uses UTC, not the local time zone', () => {
    expect(formatZulu('2026-10-15T23:30:00+02:00')).toBe('21:30Z');
  });

  it('accepts ISO strings, as the API sends them', () => {
    expect(formatZulu('2026-10-15T00:00:00.000Z')).toBe('00:00Z');
  });

  it('rejects an invalid time', () => {
    expect(() => formatZulu('not a date')).toThrow(RangeError);
  });
});
