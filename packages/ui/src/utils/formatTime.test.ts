import { describe, expect, it } from 'vitest';

import { formatTime } from './formatTime';

// Tests run in Europe/Brussels (`testTimeEnv`): UTC+2 in summer, UTC+1 in winter.
describe('formatTime', () => {
  it('formats local 24-hour hours and minutes, without a suffix', () => {
    expect(formatTime(new Date('2026-10-15T20:14:59Z'))).toBe('22:14');
  });

  it('zero-pads single digits', () => {
    expect(formatTime(new Date('2026-10-15T01:07:00Z'))).toBe('03:07');
  });

  it('follows summer and winter time', () => {
    expect(formatTime('2026-07-01T12:00:00Z')).toBe('14:00');
    expect(formatTime('2026-12-01T12:00:00Z')).toBe('13:00');
  });

  it('accepts ISO strings in any offset, as the API sends them', () => {
    expect(formatTime('2026-10-15T23:30:00+02:00')).toBe('23:30');
  });

  it('rejects an invalid time', () => {
    expect(() => formatTime('not a date')).toThrow(RangeError);
  });
});
