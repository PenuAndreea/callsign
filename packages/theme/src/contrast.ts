/** WCAG 2 contrast helpers for the theme tests. Internal: not exported from the package. */

export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

const HEX = /^#([0-9a-f]{6})$/i;
const RGBA = /^rgba\(\s*(\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\s*\)$/i;

/** Parses `#RRGGBB` or `rgba(r, g, b, a)`, the two formats the color files use. */
export function parseColor(color: string): Rgba {
  const hex = HEX.exec(color)?.[1];
  if (hex) {
    const value = Number.parseInt(hex, 16);
    return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255, a: 1 };
  }
  const rgba = RGBA.exec(color);
  if (rgba) {
    const [, r, g, b, a] = rgba.map(Number);
    return { r: r ?? 0, g: g ?? 0, b: b ?? 0, a: a ?? 1 };
  }
  throw new Error(`Unsupported color format: ${color}`);
}

/** Blends a (possibly translucent) color onto an opaque background. */
export function composite(color: string, background: string): Rgba {
  const top = parseColor(color);
  const bottom = parseColor(background);
  const mix = (front: number, back: number) => front * top.a + back * (1 - top.a);
  return { r: mix(top.r, bottom.r), g: mix(top.g, bottom.g), b: mix(top.b, bottom.b), a: 1 };
}

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance({ r, g, b }: Rgba): number {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/**
 * Contrast ratio of `foreground` on an opaque `background`. A translucent foreground is
 * blended first; blend a translucent background onto its parent with `composite` + `toHex`.
 */
export function contrastRatio(foreground: string, background: string): number {
  const back = parseColor(background);
  if (back.a < 1) throw new Error(`Background must be opaque: ${background}`);
  const front = composite(foreground, background);
  const [light = 0, dark = 0] = [relativeLuminance(front), relativeLuminance(back)].sort(
    (x, y) => y - x,
  );
  return (light + 0.05) / (dark + 0.05);
}

export function toHex({ r, g, b }: Rgba): string {
  const part = (n: number) => Math.round(n).toString(16).padStart(2, '0');
  return `#${part(r)}${part(g)}${part(b)}`;
}
