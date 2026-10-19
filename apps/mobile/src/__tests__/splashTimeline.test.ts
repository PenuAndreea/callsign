import type { Beat } from '@/splash/timeline';
import {
  BEATS,
  DIAL_KEYFRAMES,
  DIAL_LINE_HEIGHT,
  DIAL_LINES,
  LETTER_DURATION,
  LETTER_STARTS,
  NEEDLE_KEYFRAMES,
  PING_BEATS,
  phase,
} from '@/splash/timeline';

const allBeats: Beat[] = [...Object.values(BEATS), ...PING_BEATS];

describe('phase', () => {
  const beat: Beat = [0.2, 0.6];

  it('is 0 before the beat and 1 after it', () => {
    expect(phase(0, beat)).toBe(0);
    expect(phase(0.2, beat)).toBe(0);
    expect(phase(0.6, beat)).toBe(1);
    expect(phase(1, beat)).toBe(1);
  });

  it('is linear inside the beat', () => {
    expect(phase(0.4, beat)).toBeCloseTo(0.5);
    expect(phase(0.3, beat)).toBeCloseTo(0.25);
  });
});

describe('splash timeline', () => {
  it('keeps every beat inside 0..1 and in order', () => {
    allBeats.forEach(([start, end]) => {
      expect(start).toBeGreaterThanOrEqual(0);
      expect(end).toBeLessThanOrEqual(1);
      expect(start).toBeLessThan(end);
    });
  });

  it('reveals the wordmark letters left to right, all before the tagline ends', () => {
    expect(LETTER_STARTS).toEqual([...LETTER_STARTS].sort((a, b) => a - b));
    expect(LETTER_STARTS).toHaveLength('CALLSIGN'.length);
    const lastEnd = (LETTER_STARTS.at(-1) ?? 0) + LETTER_DURATION;
    expect(lastEnd).toBeLessThanOrEqual(BEATS.tagline[1]);
  });

  it('locks the carrier only after the dial has settled', () => {
    const settledAt = DIAL_KEYFRAMES.input[4] ?? 1;
    expect(BEATS.lockIn[0]).toBeGreaterThanOrEqual(settledAt);
  });

  it('has matching keyframe input and output lengths', () => {
    expect(DIAL_KEYFRAMES.input).toHaveLength(DIAL_KEYFRAMES.offsetsPx.length);
    expect(NEEDLE_KEYFRAMES.input).toHaveLength(NEEDLE_KEYFRAMES.offsetsPx.length);
  });

  it('ends on the last dial line with the needle centred', () => {
    expect(DIAL_KEYFRAMES.offsetsPx.at(-1)).toBe(-(DIAL_LINES.length - 1) * DIAL_LINE_HEIGHT);
    expect(NEEDLE_KEYFRAMES.offsetsPx.at(-1)).toBe(0);
  });
});
