import { View } from 'react-native';

import { SplashEmblem } from '../SplashEmblem/SplashEmblem';
import { SplashTuner } from '../SplashTuner/SplashTuner';
import { SplashWordmark } from '../SplashWordmark/SplashWordmark';
import { useSplashProgress } from '../useSplashProgress';
import { useSplashStyles } from './Splash.styles';
import type { SplashProps } from './Splash.types';

/**
 * The animated intro: radar sweep, wordmark, then a frequency dial that locks on. One element
 * for screen readers. When to leave it (intro played, app ready) is the caller's call.
 */
export function Splash({ onFinish }: SplashProps) {
  const styles = useSplashStyles();
  const { progress, reduceMotion } = useSplashProgress(onFinish);

  return (
    <View style={styles.root} accessible aria-label="Callsign, connecting">
      <SplashEmblem progress={progress} reduceMotion={reduceMotion} />
      <SplashWordmark progress={progress} />
      <SplashTuner progress={progress} />
    </View>
  );
}
