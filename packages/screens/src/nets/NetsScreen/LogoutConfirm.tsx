import { Button, Text } from '@callsign/ui';
import { View } from 'react-native';

import { useNetsStyles } from './NetsScreen.styles';

interface LogoutConfirmProps {
  /** Messages this device has not got saved: logging out wipes them with the rest. */
  unsent: number;
  loggingOut: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function unsentLossMessage(unsent: number): string {
  const messages = unsent === 1 ? '1 message' : `${unsent} messages`;
  return `${messages} not sent will be lost. Log out anyway?`;
}

/**
 * Asked before logging out with unsent messages (the outbox is wiped with the rest of the
 * station's data). In the screen, not a native alert: react-native-web has none.
 */
export function LogoutConfirm({ unsent, loggingOut, onConfirm, onCancel }: LogoutConfirmProps) {
  const styles = useNetsStyles();
  return (
    <View role="alert" style={styles.confirm}>
      <Text variant="small" tone="dangerText">
        {unsentLossMessage(unsent)}
      </Text>
      <View style={styles.confirmActions}>
        <Button
          label="Log out anyway"
          variant="secondary"
          size="small"
          loading={loggingOut}
          onPress={onConfirm}
        />
        <Button label="Cancel" variant="link" onPress={onCancel} />
      </View>
    </View>
  );
}
