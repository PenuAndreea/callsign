import { Text } from '@callsign/ui';
import type { ComponentProps, ReactNode } from 'react';
import { View } from 'react-native';

import { useChatStyles } from './ChatScreen.styles';

export interface ChatNoticeProps {
  message: string;
  tone?: ComponentProps<typeof Text>['tone'];
  /** Announced when it appears (a failure, not a calm state). */
  alert?: boolean;
  /** What the user can do about it, under the message. */
  children?: ReactNode;
}

/** A centered message in place of the traffic: empty, failed, not a member, off the air. */
export function ChatNotice({ message, tone, alert = false, children }: ChatNoticeProps) {
  const styles = useChatStyles();
  return (
    <View style={styles.center}>
      <Text
        variant="body"
        {...(tone && { tone })}
        {...(alert && { role: 'alert' as const })}
        style={styles.centerText}
      >
        {message}
      </Text>
      {children}
    </View>
  );
}
