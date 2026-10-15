import type { ComponentType } from 'react';
import { Platform, Pressable, type PressableProps } from 'react-native';

/** react-native-web's Pressable also takes `delayPressIn`; React Native's types don't list it. */
const WebPressable = Pressable as ComponentType<PressableProps & { delayPressIn?: number }>;

/**
 * `Pressable` with immediate pressed feedback on web. react-native-web waits 50 ms before
 * entering the pressed state, so a quick click starts and ends inside one render and shows
 * nothing. Native already keeps the pressed state up for a minimum duration.
 */
export function PressableBase(props: PressableProps) {
  return <WebPressable {...props} {...(Platform.OS === 'web' && { delayPressIn: 0 })} />;
}
