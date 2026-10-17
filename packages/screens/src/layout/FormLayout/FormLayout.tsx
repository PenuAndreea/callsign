import { Text } from '@callsign/ui';
import { ScrollView, View } from 'react-native';

import { useFormLayoutStyles } from './FormLayout.styles';
import type { FormLayoutProps } from './FormLayout.types';

/**
 * Frame of the form screens (sign in, register, new net, status): one centered column (capped on wide web windows) that
 * scrolls when the keyboard or a small screen needs it. Taps on buttons still land while the
 * keyboard is open (`handled`).
 */
export function FormLayout({ header, footer, children }: FormLayoutProps) {
  const styles = useFormLayoutStyles();

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
