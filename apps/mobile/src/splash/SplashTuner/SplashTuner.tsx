import { Text, useTheme } from '@callsign/ui';
import { View } from 'react-native';
import Animated, { interpolate, interpolateColor, useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { BEATS, DIAL_KEYFRAMES, DIAL_LINES, NEEDLE_KEYFRAMES, phase } from '../timeline';
import { STRIP_HEIGHT, useSplashTunerStyles } from './SplashTuner.styles';
import type { SplashTunerProps } from './SplashTuner.types';

const PANEL_RISE = 10;
const TICKS_PATH =
  'M2 8v14M19 14v8M36 14v8M53 14v8M70 8v14M87 14v8M104 14v8M121 14v8M138 8v14M155 14v8M172 14v8M189 14v8M206 8v14M223 14v8M240 14v8M257 14v8M274 8v14M291 14v8M308 14v8M325 14v8M342 8v14';

/** Frequency panel (dial and needle), then the "acquiring signal / carrier locked" status. */
export function SplashTuner({ progress }: SplashTunerProps) {
  const styles = useSplashTunerStyles();
  const { colors } = useTheme();
  const { lampOff, lampOn } = colors;

  const panelStyle = useAnimatedStyle(() => {
    const t = phase(progress.value, BEATS.panel);
    return { opacity: t, transform: [{ translateY: (1 - t) * PANEL_RISE }] };
  });
  const dialStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(progress.value, DIAL_KEYFRAMES.input, DIAL_KEYFRAMES.offsetsPx) },
    ],
  }));
  const needleStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(progress.value, NEEDLE_KEYFRAMES.input, NEEDLE_KEYFRAMES.offsetsPx),
      },
    ],
  }));
  const statusStyle = useAnimatedStyle(() => ({ opacity: phase(progress.value, BEATS.statusRow) }));
  const acquiringStyle = useAnimatedStyle(() => ({
    opacity: 1 - phase(progress.value, BEATS.acquiringOut),
  }));
  const lockedStyle = useAnimatedStyle(() => ({ opacity: phase(progress.value, BEATS.lockIn) }));
  const lampStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(phase(progress.value, BEATS.lamp), [0, 1], [lampOff, lampOn]),
  }));

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.panel, panelStyle]}>
        <View style={styles.panelHeader}>
          <Text variant="meta" tone="displayMuted">
            Tuning
          </Text>
          <Text variant="meta" tone="displayMuted">
            MHz
          </Text>
        </View>
        <View style={styles.dialWindow}>
          <Animated.View style={dialStyle}>
            {DIAL_LINES.map((line) => (
              <Text key={line} variant="display" tone="displayText" style={styles.dialLine}>
                {line}
              </Text>
            ))}
          </Animated.View>
        </View>
        <View style={styles.strip}>
          <Svg
            width="100%"
            height={STRIP_HEIGHT}
            viewBox={`0 0 350 ${STRIP_HEIGHT}`}
            preserveAspectRatio="none"
          >
            <Path d={TICKS_PATH} stroke={colors.tick} strokeWidth={1.5} />
          </Svg>
          <Animated.View style={[styles.needle, needleStyle]} />
        </View>
      </Animated.View>

      <Animated.View style={[styles.status, statusStyle]}>
        <Animated.View style={[styles.lamp, lampStyle]} />
        <View style={styles.statusText}>
          <Animated.View style={acquiringStyle}>
            <Text variant="meta">Acquiring signal</Text>
          </Animated.View>
          <Animated.View style={[styles.statusOverlay, lockedStyle]}>
            <Text variant="meta" tone="text">
              Carrier locked
            </Text>
          </Animated.View>
        </View>
      </Animated.View>
    </View>
  );
}
