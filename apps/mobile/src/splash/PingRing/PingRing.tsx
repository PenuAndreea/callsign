import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated';

import { phase } from '../timeline';
import { usePingRingStyles } from './PingRing.styles';
import type { PingRingProps } from './PingRing.types';

/** One radio ripple leaving the emblem, visible only during its beat. */
export function PingRing({ progress, beat }: PingRingProps) {
  const styles = usePingRingStyles();
  const ripple = useAnimatedStyle(() => {
    const t = phase(progress.value, beat);
    return {
      opacity: interpolate(t, [0, 0.2, 1], [0, 0.55, 0]),
      transform: [{ scale: 0.5 + 1.2 * t }],
    };
  });

  return <Animated.View pointerEvents="none" style={[styles.ring, ripple]} />;
}
