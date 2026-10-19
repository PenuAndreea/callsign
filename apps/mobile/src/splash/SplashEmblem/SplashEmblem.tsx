import { useTheme } from '@callsign/ui';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedProps, useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Stop } from 'react-native-svg';

import { PingRing } from '../PingRing/PingRing';
import { BEATS, DASHED_RING_PERIOD_MS, PING_BEATS, SWEEP_PERIOD_MS, phase } from '../timeline';
import { useContinuousRotation } from '../useContinuousRotation';
import { EMBLEM_SIZE, SWEEP_SIZE, useSplashEmblemStyles } from './SplashEmblem.styles';
import type { SplashEmblemProps } from './SplashEmblem.types';

const CENTER = EMBLEM_SIZE / 2;
const RING_RADIUS = 100;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;
const TICK_ANGLES = Array.from({ length: 12 }, (_, index) => index * 30);
const CENTER_ARCS =
  'M30 30a22 22 0 0 0 0 32M62 30a22 22 0 0 1 0 32M22 22a34 34 0 0 0 0 48M70 22a34 34 0 0 1 0 48';
/** Quarter wedge trailing the sweep line (from 9 o'clock up to 12 o'clock). */
const SWEEP_WEDGE = 'M100 100 L0 100 A100 100 0 0 1 100 0 Z';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedG = Animated.createAnimatedComponent(G);

/** Compass ring, ticks, radar sweep, radio ripples and the centre mark. Decorative. */
export function SplashEmblem({ progress, reduceMotion }: SplashEmblemProps) {
  const styles = useSplashEmblemStyles();
  const { colors } = useTheme();
  const sweepDegrees = useContinuousRotation(SWEEP_PERIOD_MS, !reduceMotion);
  const dashedDegrees = useContinuousRotation(DASHED_RING_PERIOD_MS, !reduceMotion);

  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: RING_LENGTH * (1 - phase(progress.value, BEATS.ring)),
  }));
  const fadeProps = useAnimatedProps(() => ({ opacity: phase(progress.value, BEATS.emblemFade) }));
  const centerProps = useAnimatedProps(() => ({ opacity: phase(progress.value, BEATS.center) }));
  const dashedStyle = useAnimatedStyle(() => ({
    opacity: phase(progress.value, BEATS.emblemFade),
    transform: [{ rotate: `${dashedDegrees.value}deg` }],
  }));
  const sweepStyle = useAnimatedStyle(() => ({
    opacity: phase(progress.value, BEATS.emblemFade),
    transform: [{ rotate: `${sweepDegrees.value}deg` }],
  }));

  return (
    <View style={styles.root} aria-hidden importantForAccessibility="no-hide-descendants">
      {PING_BEATS.map((beat) => (
        <PingRing key={beat[0]} progress={progress} beat={beat} />
      ))}

      <Svg width={EMBLEM_SIZE} height={EMBLEM_SIZE} style={StyleSheet.absoluteFill}>
        <AnimatedCircle
          animatedProps={ringProps}
          cx={CENTER}
          cy={CENTER}
          r={RING_RADIUS}
          stroke={colors.primary}
          strokeWidth={2.5}
          strokeDasharray={RING_LENGTH}
          fill="none"
          rotation={-90}
          origin={`${CENTER}, ${CENTER}`}
        />
        <AnimatedG
          animatedProps={fadeProps}
          stroke={colors.primary}
          strokeWidth={2}
          strokeLinecap="round"
        >
          {TICK_ANGLES.map((angle) => (
            <Line
              key={angle}
              x1={CENTER}
              y1={4}
              x2={CENTER}
              y2={18}
              rotation={angle}
              origin={`${CENTER}, ${CENTER}`}
            />
          ))}
        </AnimatedG>
        <AnimatedG
          animatedProps={fadeProps}
          stroke={colors.primary}
          strokeWidth={1}
          strokeOpacity={0.25}
          fill="none"
        >
          <Path d="M110 24v172M24 110h172" />
          <Circle cx={CENTER} cy={CENTER} r={52} />
        </AnimatedG>
        <AnimatedG animatedProps={centerProps} x={64} y={64}>
          <Circle cx={46} cy={46} r={5} fill={colors.primary} />
          <Path
            d={CENTER_ARCS}
            stroke={colors.primary}
            strokeWidth={2.5}
            strokeLinecap="round"
            fill="none"
          />
        </AnimatedG>
      </Svg>

      {!reduceMotion && (
        <>
          <Animated.View testID="splash-dashed-ring" style={[StyleSheet.absoluteFill, dashedStyle]}>
            <Svg width={EMBLEM_SIZE} height={EMBLEM_SIZE}>
              <Circle
                cx={CENTER}
                cy={CENTER}
                r={84}
                stroke={colors.primary}
                strokeOpacity={0.5}
                strokeWidth={1.5}
                strokeDasharray="3 7"
                fill="none"
              />
            </Svg>
          </Animated.View>
          <Animated.View testID="splash-sweep" style={[styles.sweep, sweepStyle]}>
            <Svg width={SWEEP_SIZE} height={SWEEP_SIZE}>
              {/* The one gradient in v1: an approved exception for the splash (see the design README). */}
              <Defs>
                <LinearGradient
                  id="sweepFade"
                  x1="0"
                  y1="100"
                  x2="100"
                  y2="0"
                  gradientUnits="userSpaceOnUse"
                >
                  <Stop offset="0" stopColor={colors.lampOn} stopOpacity={0} />
                  <Stop offset="1" stopColor={colors.lampOn} stopOpacity={0.4} />
                </LinearGradient>
              </Defs>
              <Path d={SWEEP_WEDGE} fill="url(#sweepFade)" />
            </Svg>
          </Animated.View>
        </>
      )}
    </View>
  );
}
