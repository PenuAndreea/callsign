export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 14,
  xl: 20, // screen side gutter
  xxl: 24,
} as const;

export const radii = {
  tail: 4, // the "pointed" corner of a message bubble
  input: 14,
  card: 16,
  button: 16,
  bubble: 18,
  sheet: 24, // top corners of the composer
  pill: 999,
} as const;

export const sizes = {
  touch: 44, // minimum tap target
  input: 54,
  button: 58,
  tx: 56, // round transmit button
  lamp: 12, // status dot
} as const;
