import { fontFamilies } from '@callsign/theme';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { loadFonts } from '../fonts';

class FakeFontFace {
  constructor(
    readonly family: string,
    readonly source: string,
  ) {}
  load = vi.fn(() => Promise.resolve(this));
}

describe('loadFonts', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('registers and loads one face per theme font family', async () => {
    vi.stubGlobal('FontFace', FakeFontFace);
    const add = vi.fn();

    const faces = await loadFonts({ add } as unknown as FontFaceSet);

    const families = faces.map((face) => face.family);
    expect(families.sort()).toEqual(Object.values(fontFamilies).sort());
    expect(add).toHaveBeenCalledTimes(Object.keys(fontFamilies).length);
    for (const face of faces) expect(face.load).toHaveBeenCalled();
  });

  it('points every face at a font file', async () => {
    vi.stubGlobal('FontFace', FakeFontFace);

    const faces = await loadFonts({ add: vi.fn() } as unknown as FontFaceSet);

    for (const face of faces) {
      expect((face as unknown as FakeFontFace).source).toMatch(/^url\(.+\.ttf\)$/);
    }
  });
});
