import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

export interface ScreenHeaderProps {
  /** Screen title, the page heading. */
  title: string;
  /** Tracked line above the title, e.g. "Station WOLF-2" or "Net · Tower and ground". */
  eyebrow?: string;
  /** Tracked line below the title, e.g. "4 stations on net". */
  subtitle?: string;
  /** Shows the back button when set. */
  onBack?: () => void;
  /** Accessible name of the back button. Defaults to "Back". */
  backLabel?: string;
  /** Right-hand slot, e.g. a "Leave" or "Log out" button. */
  action?: ReactNode;
  /** One line with an ellipsis (chat header); otherwise the title wraps. */
  truncateTitle?: boolean;
  style?: StyleProp<ViewStyle>;
}
