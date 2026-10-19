import { describe, expect, it } from 'vitest';

import { dayKey, dayLabel } from './day';

// Tests run in Europe/Brussels (`testTimeEnv`): UTC+2 in summer, UTC+1 in winter.
const now = new Date('2026-10-19T12:00:00.000Z');

describe('dayKey', () => {
  it('is the local day, which can differ from the UTC one', () => {
    expect(dayKey('2026-10-19T21:59:00.000Z')).toBe('2026-10-19');
    expect(dayKey('2026-10-19T22:00:00.000Z')).toBe('2026-10-20');
  });
});

describe('dayLabel', () => {
  it('says Today and Yesterday by the local day', () => {
    expect(dayLabel('2026-10-18T22:00:00.000Z', now)).toBe('Today');
    expect(dayLabel('2026-10-18T21:59:00.000Z', now)).toBe('Yesterday');
    expect(dayLabel('2026-10-17T22:00:00.000Z', now)).toBe('Yesterday');
  });

  it('finds yesterday across a summer-time change', () => {
    // Summer time ends on 25 Oct 2026: that day lasts 25 hours.
    const afterChange = new Date('2026-10-26T00:30:00.000Z'); // 01:30 on 26 Oct
    expect(dayLabel('2026-10-24T22:30:00.000Z', afterChange)).toBe('Yesterday'); // 00:30 on 25 Oct
  });

  it('names older days, with the year only when it is another one', () => {
    expect(dayLabel('2026-10-17T12:00:00.000Z', now)).toBe('17 Oct');
    expect(dayLabel('2026-01-01T08:00:00.000Z', now)).toBe('1 Jan');
    expect(dayLabel('2025-12-31T12:00:00.000Z', now)).toBe('31 Dec 2025');
  });
});
