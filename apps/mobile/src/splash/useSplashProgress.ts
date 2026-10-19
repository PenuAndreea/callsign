import { useEffect, useEffectEvent } from 'react';
import type { SharedValue } from 'react-native-reanimated';
import {
  Easing,
  cancelAnimation,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { REDUCED_MOTION_HOLD_MS, SPLASH_DURATION_MS } from './timeline';

export interface SplashProgress {
  /** 0 -> 1 once over the intro; every element reads its beat from it. */
  progress: SharedValue<number>;
  reduceMotion: boolean;
}

/**
 * Drives the intro: `progress` runs 0 -> 1 once, then `onFinish` fires. With reduced motion the
 * final frame shows at once and `onFinish` fires after a short hold, so "CARRIER LOCKED" is
 * still read.
 */
export function useSplashProgress(onFinish?: () => void): SplashProgress {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(reduceMotion ? 1 : 0);
  const finished = useEffectEvent(() => onFinish?.());

  useEffect(() => {
    const finish = () => finished();
    if (reduceMotion) {
      progress.value = 1;
      const timer = setTimeout(finish, REDUCED_MOTION_HOLD_MS);
      return () => clearTimeout(timer);
    }

    progress.value = 0;
    progress.value = withTiming(
      1,
      { duration: SPLASH_DURATION_MS, easing: Easing.linear },
      (done) => {
        // Not when cancelled (unmounted): the splash is gone, nobody waits for it.
        if (done) scheduleOnRN(finish);
      },
    );
    return () => cancelAnimation(progress);
  }, [progress, reduceMotion]);

  return { progress, reduceMotion };
}
