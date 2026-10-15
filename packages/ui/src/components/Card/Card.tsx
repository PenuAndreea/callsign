import { View } from 'react-native';

import { useCardStyles } from './Card.styles';
import type { CardProps } from './Card.types';

/** Rounded surface for forms, list rows and other grouped content. */
export function Card({ style, ...props }: CardProps) {
  const styles = useCardStyles();

  return <View {...props} style={[styles.card, style]} />;
}
