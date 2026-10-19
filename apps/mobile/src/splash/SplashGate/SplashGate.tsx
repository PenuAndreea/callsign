import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeOut } from 'react-native-reanimated';

import { Splash } from '../Splash/Splash';
import { useSplashGate } from '../useSplashGate';
import { SPLASH_FADE_MS, splashGateStyles as styles } from './SplashGate.styles';
import type { SplashGateProps } from './SplashGate.types';

/**
 * The animated splash over the app until `useSplashGate` lets it go. Takes over from the native
 * splash, which shows the same emblem, as soon as it mounts (fonts are loaded by then). The
 * intro and the minimum time start only once the native splash is gone: whatever still covers
 * the app at start-up (Expo Go's loader on a slow first load) does not eat the intro.
 */
export function SplashGate({ ready, children }: SplashGateProps) {
  const [visible, setVisible] = useState(false);
  const { showSplash, onIntroFinished } = useSplashGate(ready, visible);

  useEffect(() => {
    // Rejects when there is no native splash left to hide: visible either way.
    void SplashScreen.hideAsync()
      .catch(() => undefined)
      .then(() => setVisible(true));
  }, []);

  return (
    <View style={styles.root}>
      {/* Under the splash, screen readers must not reach the app. */}
      <View style={styles.app} aria-hidden={showSplash}>
        {children}
      </View>
      {showSplash && (
        <Animated.View style={styles.splash} exiting={FadeOut.duration(SPLASH_FADE_MS)}>
          <Splash onFinish={onIntroFinished} started={visible} />
        </Animated.View>
      )}
    </View>
  );
}
