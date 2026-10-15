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
  const text = value.trim();
  const canSend = !disabled && text.length > 0;

  const send = () => {
    if (canSend) onSend(text);
  };

  return (
    <View style={[styles.sheet, style]}>
      <Input
        label="Message"
        variant="chat"
        hideLabel
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={send}
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
        onPress={send}
      />
    </View>
  );
}
