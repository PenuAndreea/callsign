import { createStyles } from '@callsign/ui';

/** The emblem's square (also the SVG viewBox). */
export const EMBLEM_SIZE = 220;
/** The rotating radar sweep's square, centred in the emblem. */
export const SWEEP_SIZE = 200;

export const useSplashEmblemStyles = createStyles(() => ({
  root: { width: EMBLEM_SIZE, height: EMBLEM_SIZE, alignItems: 'center', justifyContent: 'center' },
  sweep: {
    position: 'absolute',
    left: (EMBLEM_SIZE - SWEEP_SIZE) / 2,
    top: (EMBLEM_SIZE - SWEEP_SIZE) / 2,
    width: SWEEP_SIZE,
    height: SWEEP_SIZE,
  },
}));
