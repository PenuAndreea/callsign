import { View } from 'react-native';

import { IconButton } from '../IconButton/IconButton';
import { Text } from '../Text/Text';
import { useScreenHeaderStyles } from './ScreenHeader.styles';
import type { ScreenHeaderProps } from './ScreenHeader.types';

/** Top of a screen: optional back button, title with meta lines, optional action on the right. */
export function ScreenHeader({
  title,
  eyebrow,
  subtitle,
  onBack,
  backLabel = 'Back',
  action,
  truncateTitle = false,
  style,
}: ScreenHeaderProps) {
  const styles = useScreenHeaderStyles();

  return (
    <View style={[styles.header, style]}>
      {onBack && <IconButton icon="chevronLeft" aria-label={backLabel} onPress={onBack} />}
      <View style={styles.titles}>
        {eyebrow && <Text variant="meta">{eyebrow}</Text>}
        <Text
          variant="title"
          role="heading"
          aria-level={1}
          {...(truncateTitle && { numberOfLines: 1 })}
        >
          {title}
        </Text>
        {subtitle && <Text variant="meta">{subtitle}</Text>}
      </View>
      {action}
    </View>
  );
}
