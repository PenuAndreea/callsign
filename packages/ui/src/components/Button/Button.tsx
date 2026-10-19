import { ActivityIndicator } from 'react-native';

import { useTheme } from '../../theme/useTheme';
import { Icon } from '../Icon/Icon';
import { PressableBase } from '../PressableBase/PressableBase';
import { Text } from '../Text/Text';
import type { TextTone, TextVariant } from '../Text/Text.types';
import { useButtonStyles } from './Button.styles';
import type { ButtonProps, ButtonVariant } from './Button.types';

/** Match the label's cap height, regular and small. */
const ICON_SIZE = 20;
const SMALL_ICON_SIZE = 14;

const labelProps: Record<ButtonVariant, { variant: TextVariant; tone: TextTone }> = {
  primary: { variant: 'button', tone: 'onPrimary' },
  secondary: { variant: 'button', tone: 'primary' },
  link: { variant: 'meta', tone: 'primary' },
};

export function Button({
  label,
  variant = 'primary',
  size = 'regular',
  icon,
  disabled = false,
  loading = false,
  style,
  ...props
}: ButtonProps) {
  const styles = useButtonStyles();
  const { colors } = useTheme();
  const inactive = disabled || loading;
  const { tone } = labelProps[variant];
  const small = size === 'small' && variant !== 'link';
  const textProps = small ? { variant: 'label' as const, tone } : labelProps[variant];

  return (
    <PressableBase
      role="button"
      {...props}
      disabled={inactive}
      aria-disabled={inactive}
      aria-busy={loading}
      aria-label={props['aria-label'] ?? props.accessibilityLabel ?? label}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        small && styles.small,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors[tone]} />
      ) : (
        <>
          <Text {...textProps} style={variant === 'link' && styles.linkLabel}>
            {label}
          </Text>
          {icon && (
            <Icon
              name={icon}
              size={small ? SMALL_ICON_SIZE : ICON_SIZE}
              tone={tone}
              testID="button-icon"
            />
          )}
        </>
      )}
    </PressableBase>
  );
}
