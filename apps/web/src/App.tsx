import { spacing } from '@callsign/theme';
import { Button, Card, createStyles, Icon, IconButton, Text, ThemeProvider } from '@callsign/ui';
import { View } from 'react-native';

// Temporary M1 check that the shared UI renders through react-native-web; replaced by
// the real screens in M5.
const useStyles = createStyles(({ colors }) => ({
  screen: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.xxl,
    backgroundColor: colors.background,
  },
  card: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
}));

function Preview() {
  const styles = useStyles();

  return (
    <View style={styles.screen}>
      <View style={styles.row}>
        <IconButton icon="chevronLeft" aria-label="Back" onPress={() => undefined} />
        <Icon name="radio" size={56} tone="primary" />
        <IconButton text="TX" variant="primary" aria-label="Send" onPress={() => undefined} />
      </View>
      <Text variant="display" role="heading">
        Callsign
      </Text>
      <Card style={styles.card}>
        <Text variant="label">Tower and ground</Text>
        <Text>Hold at bay four, engines off.</Text>
        <Text variant="meta">22:14Z</Text>
      </Card>
      <Button label="Report in" onPress={() => undefined} />
      <Button label="Leave" variant="secondary" onPress={() => undefined} />
      <Button label="New station? Register here" variant="link" onPress={() => undefined} />
    </View>
  );
}

function App() {
  return (
    <ThemeProvider>
      <Preview />
    </ThemeProvider>
  );
}

export default App;
