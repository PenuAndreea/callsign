import { describe, expect, it } from 'vitest';

import { composite, contrastRatio, toHex } from '../contrast';
import type { ThemeColors } from '../colors.types';
import { fontSizes, lineHeights } from '../typography';
import { darkTheme, lightTheme, themes } from '../theme';

type ColorKey = keyof ThemeColors;

/** Text pairs that must reach WCAG AA for normal text (4.5:1). */
const TEXT_PAIRS: [foreground: ColorKey, background: ColorKey][] = [
  ['text', 'background'],
  ['text', 'surface'],
  ['text', 'surfaceInset'],
  ['textMuted', 'background'],
  ['textMuted', 'surface'],
  ['textMuted', 'surfaceInset'],
  ['textMuted', 'sheet'],
  ['label', 'background'],
  ['label', 'surface'],
  ['onPrimary', 'primary'],
  ['bubbleOutText', 'bubbleOut'],
  ['bubbleOutMeta', 'bubbleOut'],
  ['onDanger', 'danger'],
  ['dangerText', 'background'],
  ['dangerText', 'surface'],
];

/** Non-text indicators that must reach 3:1. */
const INDICATOR_PAIRS: [foreground: ColorKey, background: ColorKey][] = [
  ['lampOn', 'surface'],
  ['lampOn', 'background'],
];

describe.each([lightTheme, darkTheme])('$scheme theme', ({ colors }) => {
  it.each(TEXT_PAIRS)('%s on %s reaches 4.5:1', (foreground, background) => {
    expect(contrastRatio(colors[foreground], colors[background])).toBeGreaterThanOrEqual(4.5);
  });

  it.each(INDICATOR_PAIRS)('%s on %s reaches 3:1', (foreground, background) => {
    expect(contrastRatio(colors[foreground], colors[background])).toBeGreaterThanOrEqual(3);
  });

  it('dangerText on the dangerSoft banner reaches 4.5:1', () => {
    const banner = toHex(composite(colors.dangerSoft, colors.surface));
    expect(contrastRatio(colors.dangerText, banner)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('themes', () => {
  it('maps each scheme to its theme', () => {
    expect(themes.light.scheme).toBe('light');
    expect(themes.dark.scheme).toBe('dark');
  });

  it('gives both schemes the same color keys', () => {
    expect(Object.keys(darkTheme.colors).sort()).toEqual(Object.keys(lightTheme.colors).sort());
  });
});

describe('typography', () => {
  it('gives every font size a line height at least as tall', () => {
    for (const [size, value] of Object.entries(fontSizes)) {
      expect(lineHeights[size as keyof typeof fontSizes]).toBeGreaterThanOrEqual(value);
    }
  });
});
