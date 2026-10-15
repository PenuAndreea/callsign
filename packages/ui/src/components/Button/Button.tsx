import { ActivityIndicator, Pressable } from 'react-native';

import { useTheme } from '../../theme/useTheme';
import { Text } from '../Text/Text';
import type { TextTone, TextVariant } from '../Text/Text.types';
import { useButtonStyles } from './Button.styles';
import type { ButtonProps, ButtonVariant } from './Button.types';

const labelProps: Record<ButtonVariant, { variant: TextVariant; tone: TextTone }> = {
  primary: { variant: 'button', tone: 'onPrimary' },
  secondary: { variant: 'button', tone: 'primary' },
  link: { variant: 'meta', tone: 'primary' },
};

export function Button({
  label,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  ...props
}: ButtonProps) {
  const styles = useButtonStyles();
  const { colors } = useTheme();
  const inactive = disabled || loading;
  const { tone } = labelProps[variant];

  return (
    <Pressable
      role="button"
      {...props}
      disabled={inactive}
      aria-disabled={inactive}
      aria-busy={loading}
      aria-label={props['aria-label'] ?? props.accessibilityLabel ?? label}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors[tone]} />
      ) : (
        <Text {...labelProps[variant]} style={variant === 'link' && styles.linkLabel}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}
