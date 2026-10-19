import type { SharedValue } from 'react-native-reanimated';

import type { Beat } from '../timeline';

export interface PingRingProps {
  progress: SharedValue<number>;
  /** When this ripple leaves the emblem. */
  beat: Beat;
}
