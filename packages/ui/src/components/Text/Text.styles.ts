import { fontFamilies, fontSizes, letterSpacing, lineHeights } from '@callsign/theme';
import type { TextStyle } from 'react-native';

import type { TextTone, TextVariant } from './Text.types';

/** Theme-independent typography per variant; the color comes from `defaultTone`. */
export const variantStyles: Record<TextVariant, TextStyle> = {
  display: {
    fontFamily: fontFamilies.stencilBold,
    fontSize: fontSizes.display,
    lineHeight: lineHeights.display,
    letterSpacing: letterSpacing.brand,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: fontFamilies.stencilBold,
    fontSize: fontSizes.title,
    lineHeight: lineHeights.title,
    letterSpacing: letterSpacing.normal,
    textTransform: 'uppercase',
  },
  heading: {
    fontFamily: fontFamilies.stencilBold,
    fontSize: fontSizes.heading,
    lineHeight: lineHeights.heading,
    letterSpacing: letterSpacing.normal,
    textTransform: 'uppercase',
  },
  button: {
    fontFamily: fontFamilies.stencilBold,
    fontSize: fontSizes.button,
    lineHeight: lineHeights.button,
    letterSpacing: letterSpacing.wide,
    textTransform: 'uppercase',
  },
  label: {
    fontFamily: fontFamilies.stencilBold,
    fontSize: fontSizes.label,
    lineHeight: lineHeights.label,
    letterSpacing: letterSpacing.label,
    textTransform: 'uppercase',
  },
  body: {
    fontFamily: fontFamilies.typewriter,
    fontSize: fontSizes.body,
    lineHeight: lineHeights.body,
  },
  small: {
    fontFamily: fontFamilies.typewriter,
    fontSize: fontSizes.small,
    lineHeight: lineHeights.small,
  },
  meta: {
    fontFamily: fontFamilies.mono,
    fontSize: fontSizes.caption,
    lineHeight: lineHeights.caption,
    letterSpacing: letterSpacing.wide,
    textTransform: 'uppercase',
  },
};

export const defaultTone: Record<TextVariant, TextTone> = {
  display: 'text',
  title: 'text',
  heading: 'text',
  button: 'onPrimary',
  label: 'label',
  body: 'text',
  small: 'textMuted',
  meta: 'textMuted',
};
