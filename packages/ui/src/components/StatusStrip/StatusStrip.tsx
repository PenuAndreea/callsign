import { View } from 'react-native';

import { StatusDot } from '../StatusDot/StatusDot';
import { Text } from '../Text/Text';
import { useStatusStripStyles } from './StatusStrip.styles';
import type { StatusStripProps } from './StatusStrip.types';

/**
 * One line about the link to the net (no signal, reacquiring), with a dark lamp. A status
 * region: screen readers announce it politely when it appears or its message changes. The
 * screen decides when to show it; the strip itself is always "not live".
 */
export function StatusStrip({ message, style, testID }: StatusStripProps) {
  const styles = useStatusStripStyles();

  return (
    <View
      role="status"
      aria-live="polite"
      accessibilityLiveRegion="polite"
      testID={testID}
      style={[styles.strip, style]}
    >
      <StatusDot on={false} />
      <Text variant="meta" tone="textMuted" style={styles.message}>
        {message}
      </Text>
    </View>
  );
}
