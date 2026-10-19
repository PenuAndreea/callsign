import { Button, Masthead, Text } from '@callsign/ui';

import { FormLayout } from '../../layout/FormLayout/FormLayout';
import type { CrashScreenProps } from './CrashScreen.types';

/**
 * What an error boundary shows when a screen crashed (a bug, not a failed request). No details:
 * the error went to the reporter, and the user can try again or, where offered, go back.
 */
export function CrashScreen({ onRetry, onBack }: CrashScreenProps) {
  return (
    <FormLayout>
      <Masthead title="Signal lost" subtitle="Something broke on this station" />
      <Text variant="body" role="alert">
        The fault was logged. Try again. Over.
      </Text>
      <Button label="Try again" onPress={onRetry} />
      {onBack && <Button label="Back" variant="link" onPress={onBack} />}
    </FormLayout>
  );
}
