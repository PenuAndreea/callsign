import { spacing } from '@callsign/theme';
import { Text } from '@callsign/ui';
import { ScrollView, View } from 'react-native';

import { KeyboardFrame } from '../KeyboardFrame';
import { useInsetPadding } from '../useInsetPadding';

import { useFormLayoutStyles } from './FormLayout.styles';
import type { FormLayoutProps } from './FormLayout.types';

/**
 * Frame of the form screens (sign in, register, new net, status): one centered column (capped
 * on wide web windows) that scrolls when the keyboard or a small screen needs it, clear of the
 * notch and the home indicator. Taps on buttons still land while the keyboard is open.
 */
export function FormLayout({ header, footer, children }: FormLayoutProps) {
  const styles = useFormLayoutStyles();
  const insetPadding = useInsetPadding({
    // Without a header row the masthead sits lower, as in the mockups.
    top: header === undefined ? spacing.xxl * 2 : spacing.xl,
    bottom: spacing.xl,
  });

  return (
    <KeyboardFrame style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, insetPadding]}
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
    </KeyboardFrame>
  );
}
