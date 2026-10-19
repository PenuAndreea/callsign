import { useEffect } from 'react';
import type { SharedValue } from 'react-native-reanimated';
import {
  Easing,
  cancelAnimation,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

/** Degrees (0 -> 360, looping) for a spinning element. Stays still while disabled. */
export function useContinuousRotation(periodMs: number, enabled: boolean): SharedValue<number> {
  const degrees = useSharedValue(0);

  useEffect(() => {
    if (!enabled) {
      cancelAnimation(degrees);
      return undefined;
    }
    degrees.value = 0;
    degrees.value = withRepeat(withTiming(360, { duration: periodMs, easing: Easing.linear }), -1);
    return () => cancelAnimation(degrees);
  }, [degrees, enabled, periodMs]);

  return degrees;
}
