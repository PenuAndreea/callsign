/**
 * Timeline of the one-shot splash intro. One shared `progress` value runs 0 -> 1 over
 * SPLASH_DURATION_MS; every element animates inside its own beat, a [start, end] slice of that
 * progress. Retiming the intro means editing numbers here only.
 */

export type Beat = readonly [start: number, end: number];

/** Length of the full intro (first launch). */
export const SPLASH_DURATION_MS = 6000;
/** With reduced motion the final frame shows at once, then the splash continues after this. */
export const REDUCED_MOTION_HOLD_MS = 800;
/** Rotation periods of the radar sweep and of the slow dashed ring. */
export const SWEEP_PERIOD_MS = 4000;
export const DASHED_RING_PERIOD_MS = 40000;

export const BEATS = {
  ring: [0.03, 0.2],
  emblemFade: [0.1, 0.22],
  center: [0.14, 0.24],
  tagline: [0.36, 0.44],
  panel: [0.42, 0.5],
  statusRow: [0.52, 0.58],
  acquiringOut: [0.66, 0.7],
  lockIn: [0.68, 0.73],
  lamp: [0.68, 0.72],
} as const satisfies Record<string, Beat>;

/** Radio ripples leaving the emblem. The last one fires when the carrier locks. */
export const PING_BEATS: readonly Beat[] = [
  [0.24, 0.4],
  [0.32, 0.48],
  [0.4, 0.56],
  [0.68, 0.84],
];

/** Start of each letter of the wordmark; each letter takes LETTER_DURATION. */
export const LETTER_STARTS: readonly number[] = [0.22, 0.23, 0.25, 0.26, 0.28, 0.29, 0.31, 0.32];
export const LETTER_DURATION = 0.04;

/** Frequency dial: scrolls through three numbers and settles on the last. */
export const DIAL_LINE_HEIGHT = 44;
export const DIAL_LINES: readonly string[] = ['121.500', '119.900', '118.100'];
export const DIAL_KEYFRAMES = {
  input: [0, 0.5, 0.56, 0.6, 0.66, 1],
  offsetsPx: [0, 0, -1, -1, -2, -2].map((line) => line * DIAL_LINE_HEIGHT),
} as const;

/** Tuning needle: swings in from the left, overshoots, settles in the centre. */
export const NEEDLE_KEYFRAMES = {
  input: [0, 0.5, 0.62, 0.66, 0.7, 1],
  offsetsPx: [-100, -100, 10, -3, 0, 0],
} as const;

/**
 * Where `progress` is inside a beat: 0 before it, 1 after it, linear in between. Pure math, so
 * it runs in Reanimated worklets and in plain Jest tests.
 */
export function phase(progress: number, beat: Beat): number {
  'worklet';
  const [start, end] = beat;
  if (progress <= start) return 0;
  if (progress >= end) return 1;
  return (progress - start) / (end - start);
}
