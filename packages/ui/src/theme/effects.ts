import type { ThemeColors } from '@callsign/theme';
import type { ViewStyle } from 'react-native';

const HALO_WIDTH = 6;

/** Soft ring around primary actions (Report in, TX). */
export function haloStyle(colors: ThemeColors): ViewStyle {
  return { boxShadow: `0 0 0 ${HALO_WIDTH}px ${colors.primaryHalo}` };
}

/** Low drop shadow for cards and raised surface controls. */
export function raisedStyle(colors: ThemeColors): ViewStyle {
  return { boxShadow: `0 2px 8px ${colors.shadow}` };
}

/** Feedback states shared by every pressable: a slight push in, so it reads on any background. */
export const pressedStyle: ViewStyle = { opacity: 0.85, transform: [{ scale: 0.96 }] };
export const disabledStyle: ViewStyle = { opacity: 0.5 };
