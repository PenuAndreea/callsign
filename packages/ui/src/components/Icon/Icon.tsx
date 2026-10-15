import Svg, { G } from 'react-native-svg';

import { useTheme } from '../../theme/useTheme';
import type { IconProps } from './Icon.types';
import { glyphs } from './icons';

const DEFAULT_SIZE = 24;

/**
 * Decorative glyph: hidden from assistive tech. The control around it (e.g. `IconButton`)
 * carries the accessible name.
 */
export function Icon({ name, size = DEFAULT_SIZE, tone = 'text', ...props }: IconProps) {
  const { colors } = useTheme();
  const color = colors[tone];

  return (
    <Svg
      {...props}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      pointerEvents="none"
      // Web needs this; on native an Svg is not an accessibility element by itself.
      aria-hidden
    >
      <G fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        {glyphs[name](color)}
      </G>
    </Svg>
  );
}
