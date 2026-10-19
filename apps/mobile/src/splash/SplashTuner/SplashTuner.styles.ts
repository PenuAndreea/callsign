import { fontFamilies, letterSpacing, lineHeights, radii, sizes, spacing } from '@callsign/theme';
import { createStyles } from '@callsign/ui';

import { DIAL_LINE_HEIGHT } from '../timeline';

export const PANEL_WIDTH = 236;
/** Height of the tick strip the needle runs along. */
export const STRIP_HEIGHT = 22;
/** Room for the longer status line, so the two can swap in place. */
const STATUS_WIDTH = 150;

export const useSplashTunerStyles = createStyles(({ colors }) => ({
  root: { alignItems: 'center', marginTop: spacing.xxl + spacing.xl },
  panel: {
    width: PANEL_WIDTH,
    borderRadius: radii.bubble,
    backgroundColor: colors.display,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  panelHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  dialWindow: { height: DIAL_LINE_HEIGHT, overflow: 'hidden', marginTop: spacing.xs },
  // The display variant's size, in the mono face: digits, not a wordmark.
  dialLine: {
    height: DIAL_LINE_HEIGHT,
    lineHeight: DIAL_LINE_HEIGHT,
    fontFamily: fontFamilies.mono,
    letterSpacing: letterSpacing.normal,
  },
  strip: { height: STRIP_HEIGHT, marginTop: spacing.sm, overflow: 'hidden' },
  needle: {
    position: 'absolute',
    left: '50%',
    top: 0,
    width: 2,
    height: STRIP_HEIGHT,
    marginLeft: -1,
    borderRadius: radii.pill,
    backgroundColor: colors.needle,
  },
  status: { marginTop: spacing.xxl, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  lamp: { width: sizes.lamp, height: sizes.lamp, borderRadius: radii.pill },
  statusText: { width: STATUS_WIDTH, height: lineHeights.caption },
  statusOverlay: { position: 'absolute', left: 0, top: 0 },
}));
