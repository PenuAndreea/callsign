import type { ReactElement } from 'react';
import { Circle, Path } from 'react-native-svg';

import type { IconName } from './Icon.types';

/**
 * Glyphs on a 24 x 24 grid, drawn as strokes in the icon color (set by `Icon` on the group).
 * Filled parts set `fill` themselves.
 */
export const glyphs: Record<IconName, (color: string) => ReactElement> = {
  chevronLeft: () => <Path d="M15 5l-7 7 7 7" />,
  arrowRight: () => <Path d="M4 12h15M13 6l6 6-6 6" />,
  plus: () => <Path d="M12 5v14M5 12h14" />,
  // Brand mark: a ring with radio waves around a center dot.
  radio: (color) => (
    <>
      <Circle cx={12} cy={12} r={10.5} strokeWidth={1.5} />
      <Path d="M9.2 8.8a4.5 4.5 0 0 0 0 6.4M14.8 8.8a4.5 4.5 0 0 1 0 6.4" strokeWidth={1.5} />
      <Path d="M7 6.6a7.6 7.6 0 0 0 0 10.8M17 6.6a7.6 7.6 0 0 1 0 10.8" strokeWidth={1.5} />
      <Circle cx={12} cy={12} r={1.6} fill={color} stroke="none" />
    </>
  ),
};
