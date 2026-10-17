import { Text } from '@callsign/ui';

export interface FormErrorProps {
  /** Nothing is rendered without a message. */
  message: string | undefined;
}

/** Form-level error (not tied to one field), announced when it appears. */
export function FormError({ message }: FormErrorProps) {
  if (message === undefined) return null;
  return (
    <Text variant="body" tone="dangerText" role="alert">
      {message}
    </Text>
  );
}
