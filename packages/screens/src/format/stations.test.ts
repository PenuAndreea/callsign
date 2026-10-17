import { describe, expect, it } from 'vitest';

import { stationsLabel } from './stations';

describe('stationsLabel', () => {
  it('uses the singular for one station only', () => {
    expect(stationsLabel(0)).toBe('0 stations');
    expect(stationsLabel(1)).toBe('1 station');
    expect(stationsLabel(12)).toBe('12 stations');
  });
});
