import { describe, expect, it } from 'vitest';

import { callsignSchema } from '../auth';

describe('callsignSchema', () => {
  it('trims and lowercases the callsign', () => {
    expect(callsignSchema.parse('  WOLF-2 ')).toBe('wolf-2');
  });

  it('accepts 3 and 20 characters', () => {
    expect(callsignSchema.safeParse('abc').success).toBe(true);
    expect(callsignSchema.safeParse('a'.repeat(20)).success).toBe(true);
  });

  it('rejects fewer than 3 or more than 20 characters', () => {
    expect(callsignSchema.safeParse('ab').success).toBe(false);
    expect(callsignSchema.safeParse('a'.repeat(21)).success).toBe(false);
  });

  it('checks the length after trimming', () => {
    expect(callsignSchema.safeParse('  ab  ').success).toBe(false);
  });
});
