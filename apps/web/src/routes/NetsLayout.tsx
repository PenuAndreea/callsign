import { breakpoints } from '@callsign/theme';
import { Text } from '@callsign/ui';
import { useWindowDimensions, View } from 'react-native';
import { Outlet, useMatch } from 'react-router';

import { NetsRoute } from './netsRoutes';
import { useNetsLayoutStyles } from './NetsLayout.styles';

/** What the chat route needs to know about the layout around it. */
export interface NetsLayoutContext {
  /** The nets list is on screen next to the chat (no back button needed). */
  split: boolean;
}

/**
 * Signed-in pages. Wide windows: the nets list as a sidebar, the chat (or the new-net form) in
 * the panel next to it. Narrow windows stack them like the phone app: `/` is the list, every
 * other page is full screen.
 */
export function NetsLayout() {
  const styles = useNetsLayoutStyles();
  const { width } = useWindowDimensions();
  const split = width >= breakpoints.split;
  const atList = useMatch('/') !== null;
  const openNet = useMatch('/nets/:netId')?.params.netId;
  const context: NetsLayoutContext = { split };

  if (!split) return atList ? <NetsRoute /> : <Outlet context={context} />;

  return (
    <View style={styles.split}>
      <View style={styles.sidebar}>
        <NetsRoute {...(openNet !== undefined && { selectedNetId: openNet })} />
      </View>
      <View style={styles.panel}>
        <Outlet context={context} />
      </View>
    </View>
  );
}

/** The panel at `/` on wide windows, before a net is picked. */
export function NoNetSelected() {
  const styles = useNetsLayoutStyles();
  return (
    <View style={styles.empty}>
      <Text variant="body" tone="textMuted">
        Pick a net from the list, or open a new one. Over.
      </Text>
    </View>
  );
}
