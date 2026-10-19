import type { SharedValue } from 'react-native-reanimated';

export interface SplashEmblemProps {
  progress: SharedValue<number>;
  /** Without motion the sweep and the dashed ring are left out: the emblem stays still. */
  reduceMotion: boolean;
}
