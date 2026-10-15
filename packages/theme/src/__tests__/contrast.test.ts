import { describe, expect, it } from 'vitest';

import { composite, contrastRatio, parseColor, toHex } from '../contrast';

describe('parseColor', () => {
  it('parses hex colors', () => {
    expect(parseColor('#C9A24D')).toEqual({ r: 201, g: 162, b: 77, a: 1 });
  });

  it('parses rgba colors', () => {
    expect(parseColor('rgba(200, 85, 61, 0.20)')).toEqual({ r: 200, g: 85, b: 61, a: 0.2 });
  });

  it('rejects other formats', () => {
    expect(() => parseColor('red')).toThrow('Unsupported color format');
  });
});

describe('composite', () => {
  it('blends a translucent color onto the background', () => {
    expect(toHex(composite('rgba(0, 0, 0, 0.5)', '#FFFFFF'))).toBe('#808080');
  });

  it('keeps an opaque color as is', () => {
    expect(toHex(composite('#556B2F', '#FFFFFF'))).toBe('#556b2f');
  });
});

describe('contrastRatio', () => {
  it('is 21 for black on white, in either order', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21);
    expect(contrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21);
  });

  it('is 1 for the same color', () => {
    expect(contrastRatio('#556B2F', '#556B2F')).toBeCloseTo(1);
  });

  it('rejects a translucent background', () => {
    expect(() => contrastRatio('#000000', 'rgba(0, 0, 0, 0.5)')).toThrow('opaque');
  });
});
