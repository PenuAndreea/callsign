import { spacing } from '@callsign/theme';
import { Button, Card, createStyles, Icon, IconButton, Input, StatusDot, Text } from '@callsign/ui';
import { ScrollView, View } from 'react-native';

// Temporary M1 check that the shared UI renders on native; replaced by the real screens in M5.
const useStyles = createStyles(({ colors }) => ({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, paddingVertical: spacing.xxl * 3, gap: spacing.xl },
  card: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  status: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
}));

export default function Index() {
  const styles = useStyles();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.row}>
        <IconButton icon="chevronLeft" aria-label="Back" onPress={() => undefined} />
        <Icon name="radio" size={56} tone="primary" />
        <IconButton text="TX" variant="primary" aria-label="Send" onPress={() => undefined} />
      </View>
      <Text variant="display" role="heading">
        Callsign
      </Text>
      <Card style={styles.card}>
        <View style={styles.status}>
          <StatusDot on />
          <Text variant="label">Tower and ground</Text>
        </View>
        <Text>Hold at bay four, engines off.</Text>
        <View style={styles.status}>
          <StatusDot on={false} />
          <Text variant="meta">22:14Z</Text>
        </View>
      </Card>
      <Input label="Callsign" placeholder="e.g. WOLF-2" autoCapitalize="characters" />
      <Input label="Passphrase" placeholder="Enter passphrase" secureTextEntry error="Too short" />
      <Input label="Message" variant="chat" hideLabel placeholder="Type message. Over." />
      <Button label="Report in" onPress={() => undefined} />
      <Button label="Leave" variant="secondary" onPress={() => undefined} />
      <Button label="New station? Register here" variant="link" onPress={() => undefined} />
    </ScrollView>
  );
}
