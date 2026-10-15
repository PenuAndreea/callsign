import { View } from 'react-native';

import { Icon } from '../Icon/Icon';
import { Text } from '../Text/Text';
import { LOGO_SIZE, useMastheadStyles } from './Masthead.styles';
import type { MastheadProps } from './Masthead.types';

/** Brand block for the sign-in and register screens: radio logo, title, tracked subtitle. */
export function Masthead({ title, subtitle, style }: MastheadProps) {
  const styles = useMastheadStyles();

  return (
    <View style={[styles.masthead, style]}>
      <Icon name="radio" size={LOGO_SIZE} tone="primary" />
      <Text variant="display" role="heading" aria-level={1}>
        {title}
      </Text>
      {subtitle && (
        <Text variant="meta" style={styles.subtitle}>
          {subtitle}
        </Text>
      )}
    </View>
  );
}
