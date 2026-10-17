import { Text } from '@callsign/ui';
import { ScrollView, View } from 'react-native';

import { useAuthLayoutStyles } from './AuthLayout.styles';
import type { AuthLayoutProps } from './AuthLayout.types';

/**
 * Frame of the signed-out screens: one centered column (capped on wide web windows) that
 * scrolls when the keyboard or a small screen needs it. Taps on buttons still land while the
 * keyboard is open (`handled`).
 */
export function AuthLayout({ header, footer, children }: AuthLayoutProps) {
  const styles = useAuthLayoutStyles();

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, header === undefined && styles.noHeader]}
      keyboardShouldPersistTaps="handled"
    >
      {header}
      <View style={styles.body}>{children}</View>
      {footer !== undefined && (
        <Text variant="meta" style={styles.footer}>
          {footer}
        </Text>
      )}
    </ScrollView>
  );
}
