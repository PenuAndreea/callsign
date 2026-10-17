import { Button, Masthead, Text } from '@callsign/ui';

import { AuthLayout } from '../../layout/AuthLayout/AuthLayout';
import type { UnreachableScreenProps } from './UnreachableScreen.types';

/**
 * On start, when the API gave no answer about the session (offline, server down). Not the
 * sign-in screen: the stored session may still be valid once the net is back.
 */
export function UnreachableScreen({ onRetry }: UnreachableScreenProps) {
  return (
    <AuthLayout>
      <Masthead title="No contact" subtitle="The net is not answering" />
      <Text variant="body" role="alert">
        Check your connection, then try again. Over.
      </Text>
      <Button label="Try again" onPress={onRetry} />
    </AuthLayout>
  );
}
