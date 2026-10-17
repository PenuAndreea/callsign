import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

export interface RoomListItemProps {
  /** Net name (shown uppercase, wraps). */
  name: string;
  /** Lit status dot. The status is also spoken: "joined" is part of the accessible name. */
  joined: boolean;
  /** Last message preview, one line. */
  preview?: string;
  /** Right-hand slot: a member count, or a Join button for open nets. */
  trailing?: ReactNode;
  /**
   * Spoken part of a `trailing` that is not a control, e.g. "4 stations" for a bare count.
   * Joins the row's accessible name, which otherwise skips the trailing slot.
   */
  trailingLabel?: string;
  /** Highlighted row (the open net in the web sidebar). */
  selected?: boolean;
  /**
   * Makes the whole row a button (opens the net). Leave it out when `trailing` holds a
   * button, so buttons never nest.
   */
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}
