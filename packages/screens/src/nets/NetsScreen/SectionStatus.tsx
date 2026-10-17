import { Button, Text } from '@callsign/ui';
import { ActivityIndicator, View } from 'react-native';

import { errorMessage } from '../../errors/errorMessage';
import { useNetsStyles } from './NetsScreen.styles';

export interface SectionQueryState {
  isPending: boolean;
  isFetchingNextPage: boolean;
  error: Error | null;
  /** Nets loaded so far (`undefined` before the first page). */
  data: unknown[] | undefined;
  refetch: () => unknown;
}

interface SectionStatusProps {
  query: SectionQueryState;
  /** Shown when the section loaded and is empty. */
  emptyText: string;
}

/** Under a section: first load, failure with a retry, empty copy, or the next page loading. */
export function SectionStatus({ query, emptyText }: SectionStatusProps) {
  const styles = useNetsStyles();

  if (query.isPending || query.isFetchingNextPage) {
    return (
      <View style={styles.status}>
        <ActivityIndicator />
      </View>
    );
  }
  if (query.error && query.data === undefined) {
    return (
      <View style={styles.status}>
        <Text variant="body" tone="dangerText" role="alert">
          {errorMessage(query.error)}
        </Text>
        <Button label="Try again" variant="link" onPress={() => void query.refetch()} />
      </View>
    );
  }
  if (query.data?.length === 0) {
    return (
      <View style={styles.status}>
        <Text variant="small" tone="textMuted">
          {emptyText}
        </Text>
      </View>
    );
  }
  return null;
}
