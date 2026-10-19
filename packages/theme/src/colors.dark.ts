import type { ThemeColors } from './colors.types';

/** Dark scheme: deep olive-charcoal + brass. */
export const darkColors: ThemeColors = {
  background: '#1F2318',
  surface: '#2A2F21',
  surfaceInset: '#333A29',
  sheet: '#262B1E',
  text: '#E9E4CF',
  // Lightened from #9A9C80 to reach 4.5:1 on surfaceInset (composer placeholder).
  textMuted: '#A3A588',
  label: '#C9A24D',
  primary: '#C9A24D',
  onPrimary: '#1F2318',
  primaryHalo: 'rgba(201, 162, 77, 0.25)',
  bubbleOut: '#C9A24D',
  bubbleOutText: '#1F2318',
  bubbleOutMeta: '#3A3220',
  lampOn: '#9FD36A',
  lampOff: '#5D6347',
  display: '#2A2F21',
  displayText: '#9FD36A',
  displayMuted: '#9A9C80',
  tick: '#4A5139',
  needle: '#C9A24D',
  danger: '#B5432C',
  onDanger: '#FFFFFF',
  dangerText: '#F0A48C',
  dangerSoft: 'rgba(200, 85, 61, 0.20)',
  shadow: 'rgba(0, 0, 0, 0.40)',
};
