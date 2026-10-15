import { radii, spacing } from '@callsign/theme';

import { createStyles } from '../../theme/createStyles';
import { raisedStyle } from '../../theme/effects';

const MAX_WIDTH = '80%';

export const useChatBubbleStyles = createStyles(({ colors }) => ({
  bubble: {
    maxWidth: MAX_WIDTH,
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.bubble,
  },
  incoming: {
    alignSelf: 'flex-start',
    // The small corner points at the sender's side.
    borderBottomLeftRadius: radii.tail,
    backgroundColor: colors.surface,
    ...raisedStyle(colors),
  },
  own: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: radii.tail,
    backgroundColor: colors.bubbleOut,
  },
  ownTime: {
    alignSelf: 'flex-end',
  },
}));
