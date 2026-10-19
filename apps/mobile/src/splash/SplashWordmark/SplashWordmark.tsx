import { Text } from '@callsign/ui';
import { View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { BEATS, LETTER_DURATION, LETTER_STARTS, phase } from '../timeline';
import { LETTER_RISE, TAGLINE_RISE, useSplashWordmarkStyles } from './SplashWordmark.styles';
import type { SplashLetterProps, SplashWordmarkProps } from './SplashWordmark.types';

export const WORDMARK = 'CALLSIGN';

function SplashLetter({ character, start, progress }: SplashLetterProps) {
  const rise = useAnimatedStyle(() => {
    const t = phase(progress.value, [start, start + LETTER_DURATION]);
    return { opacity: t, transform: [{ translateY: (1 - t) * LETTER_RISE }] };
  });
  return (
    <Animated.View style={rise}>
      <Text variant="display">{character}</Text>
    </Animated.View>
  );
}

/** "CALLSIGN" rising letter by letter, then the tagline. */
export function SplashWordmark({ progress }: SplashWordmarkProps) {
  const styles = useSplashWordmarkStyles();
  const tagline = useAnimatedStyle(() => {
    const t = phase(progress.value, BEATS.tagline);
    return { opacity: t, transform: [{ translateY: (1 - t) * TAGLINE_RISE }] };
  });

  return (
    <View style={styles.root}>
      <View style={styles.row}>
        {[...WORDMARK].map((character, index) => (
          <SplashLetter
            // The word never changes, so the position is a stable key.
            key={index}
            character={character}
            start={LETTER_STARTS[index] ?? 0}
            progress={progress}
          />
        ))}
      </View>
      <Animated.View style={[styles.tagline, tagline]}>
        <Text variant="meta">Field radio · flight and ground</Text>
      </Animated.View>
    </View>
  );
}
