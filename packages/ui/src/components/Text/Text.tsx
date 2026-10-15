import { Text as RNText } from 'react-native';

import { useTheme } from '../../theme/useTheme';
import { defaultTone, variantStyles } from './Text.styles';
import type { TextProps } from './Text.types';

export function Text({ variant = 'body', tone, style, ...props }: TextProps) {
  const { colors } = useTheme();
  const color = colors[tone ?? defaultTone[variant]];

  return <RNText {...props} style={[variantStyles[variant], { color }, style]} />;
}
