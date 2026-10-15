import { Icon } from '../Icon/Icon';
import type { TextTone } from '../Text/Text.types';
import { PressableBase } from '../PressableBase/PressableBase';
import { Text } from '../Text/Text';
import { useIconButtonStyles } from './IconButton.styles';
import type { IconButtonProps, IconButtonVariant } from './IconButton.types';

const contentTone: Record<IconButtonVariant, TextTone> = {
  surface: 'text',
  primary: 'onPrimary',
};

/** Compact button whose content is a glyph or a short text; its name comes from `aria-label`. */
export function IconButton({
  icon,
  text,
  variant = 'surface',
  disabled = false,
  style,
  ...props
}: IconButtonProps) {
  const styles = useIconButtonStyles();
  const tone = contentTone[variant];

  return (
    <PressableBase
      role="button"
      {...props}
      disabled={disabled}
      aria-disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && styles.pressed,
        pressed && variant === 'surface' && styles.surfacePressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {icon ? (
        <Icon name={icon} tone={tone} />
      ) : (
        <Text variant="button" tone={tone} aria-hidden>
          {text}
        </Text>
      )}
    </PressableBase>
  );
}
