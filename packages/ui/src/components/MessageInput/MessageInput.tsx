import { View } from 'react-native';

import { IconButton } from '../IconButton/IconButton';
import { Input } from '../Input/Input';
import { useMessageInputStyles } from './MessageInput.styles';
import type { MessageInputProps } from './MessageInput.types';

/** Chat composer: a pill field and the round TX send button on the bottom sheet. */
export function MessageInput({
  value,
  onChangeText,
  onSend,
  disabled = false,
  maxLength,
  placeholder = 'Type message. Over.',
  style,
}: MessageInputProps) {
  const styles = useMessageInputStyles();
  const canSend = !disabled && value.trim().length > 0;

  const send = (raw: string) => {
    const text = raw.trim();
    if (!disabled && text.length > 0) onSend(text);
  };

  return (
    <View style={[styles.sheet, style]}>
      <Input
        label="Message"
        variant="chat"
        hideLabel
        value={value}
        onChangeText={onChangeText}
        // The field's own text: Return can beat the re-render with the last keystroke or an
        // autocorrected word, and `value` would still be the previous one.
        onSubmitEditing={(event) => send(event.nativeEvent.text)}
        placeholder={placeholder}
        returnKeyType="send"
        submitBehavior="submit"
        editable={!disabled}
        {...(maxLength !== undefined && { maxLength })}
        style={styles.field}
      />
      <IconButton
        text="TX"
        variant="primary"
        aria-label="Send"
        disabled={!canSend}
        onPress={() => send(value)}
      />
    </View>
  );
}
