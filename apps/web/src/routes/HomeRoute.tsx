import { useLogout, useSignedInUser } from '@callsign/hooks';
import { Button, ScreenHeader } from '@callsign/ui';
import { View } from 'react-native';

import { useHomeStyles } from './HomeRoute.styles';

// Temporary landing page for M5 step 3; the nets list replaces it in step 4.
export function HomeRoute() {
  const user = useSignedInUser();
  const logout = useLogout();
  const styles = useHomeStyles();

  return (
    <View style={styles.screen}>
      <ScreenHeader
        eyebrow={`Station ${user.callsign.toUpperCase()}`}
        title="Nets"
        action={
          <Button
            label="Log out"
            variant="link"
            loading={logout.isPending}
            onPress={() => logout.mutate()}
          />
        }
      />
    </View>
  );
}
