import { View } from 'react-native';

import { useStatusDotStyles } from './StatusDot.styles';
import type { StatusDotProps } from './StatusDot.types';

/**
 * Status lamp. Decorative: color alone never carries meaning, so the surrounding row says
 * the status in text (e.g. "joined") and the dot is hidden from screen readers.
 */
export function StatusDot({ on, style, ...props }: StatusDotProps) {
  const styles = useStatusDotStyles();

  return <View {...props} aria-hidden style={[styles.dot, on ? styles.on : styles.off, style]} />;
}
