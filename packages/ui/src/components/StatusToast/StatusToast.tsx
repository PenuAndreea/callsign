import { View } from 'react-native';

import { Text } from '../Text/Text';
import { useStatusToastStyles } from './StatusToast.styles';
import type { StatusToastProps } from './StatusToast.types';

/**
 * A raised notice about the link to the net (no signal, reacquiring), in signal orange so it
 * catches the eye without reading as an error. A status region: screen readers announce it politely when it
 * appears or its message changes. The screen decides when to show it and where it floats; taps
 * pass through it.
 */
export function StatusToast({ message, style, testID }: StatusToastProps) {
  const styles = useStatusToastStyles();

  return (
    <View
      role="status"
      aria-live="polite"
      accessibilityLiveRegion="polite"
      testID={testID}
      style={[styles.toast, style]}
    >
      <Text variant="meta" tone="onWarning" style={styles.message}>
        {message}
      </Text>
    </View>
  );
}
