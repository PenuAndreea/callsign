import { View } from 'react-native';

import { useRestoringStyles } from './RestoringScreen.styles';

/**
 * While the session restores on start (usually well under a second). Only the themed
 * background, so nothing flashes; mobile keeps its splash screen up instead.
 */
export function RestoringScreen() {
  const styles = useRestoringStyles();
  return <View style={styles.screen} aria-busy testID="restoring-screen" />;
}
