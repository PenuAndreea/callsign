import { spacing } from '@callsign/theme';
import { StyleSheet } from 'react-native';

export const connectionToastStyles = StyleSheet.create({
  // Floats over the screen's content, inside the side gutters.
  toast: { position: 'absolute', left: spacing.xl, right: spacing.xl, zIndex: 1 },
});
