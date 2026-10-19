import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { FadeOut } from 'react-native-reanimated';

import { Splash } from '../Splash/Splash';
import { useSplashGate } from '../useSplashGate';
import { SPLASH_FADE_MS, splashGateStyles as styles } from './SplashGate.styles';
import type { SplashGateProps } from './SplashGate.types';

/**
 * The animated splash over the app until `useSplashGate` lets it go. Takes over from the native
 * splash, which shows the same emblem, as soon as it mounts (fonts are loaded by then).
 */
export function SplashGate({ ready, children }: SplashGateProps) {
  const { showSplash, onIntroFinished } = useSplashGate(ready);

  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  return (
    <View style={styles.root}>
      {/* Under the splash, screen readers must not reach the app. */}
      <View style={styles.app} aria-hidden={showSplash}>
        {children}
      </View>
      {showSplash && (
        <Animated.View style={styles.splash} exiting={FadeOut.duration(SPLASH_FADE_MS)}>
          <Splash onFinish={onIntroFinished} />
        </Animated.View>
      )}
    </View>
  );
}
