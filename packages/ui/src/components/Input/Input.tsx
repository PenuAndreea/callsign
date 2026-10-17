import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { useTheme } from '../../theme/useTheme';
import { Text } from '../Text/Text';
import { useInputStyles } from './Input.styles';
import type { InputProps } from './Input.types';

/** Labeled text field. One component for forms and the chat composer, picked by `variant`. */
export function Input({
  label,
  variant = 'form',
  hideLabel = false,
  error,
  style,
  onFocus,
  onBlur,
  ref,
  ...props
}: InputProps) {
  const styles = useInputStyles();
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const invalid = Boolean(error);

  return (
    <View style={[styles.wrapper, style]}>
      {/* The field carries the name itself, so the visible label is skipped by screen readers. */}
      {!hideLabel && (
        <Text variant="label" aria-hidden>
          {label}
        </Text>
      )}
      <TextInput
        {...props}
        ref={ref}
        aria-label={label}
        aria-invalid={invalid}
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.primary}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={[
          styles.field,
          styles[variant],
          focused && styles.focused,
          invalid && styles.invalid,
        ]}
      />
      {error && (
        <Text variant="body" tone="dangerText" role="alert">
          {error}
        </Text>
      )}
    </View>
  );
}
