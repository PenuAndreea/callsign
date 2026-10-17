import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { KeyboardAvoidingView } from 'react-native';

interface KeyboardFrameProps {
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}

/**
 * Keeps the bottom of a screen (composer, last form field) above the keyboard. `padding` on
 * both platforms: with Android's edge-to-edge (Expo SDK 57) the window no longer resizes for
 * the keyboard by itself. A plain view on web.
 */
export function KeyboardFrame({ style, children }: KeyboardFrameProps) {
  return (
    <KeyboardAvoidingView behavior="padding" style={style}>
      {children}
    </KeyboardAvoidingView>
  );
}
