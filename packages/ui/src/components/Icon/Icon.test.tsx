import { darkColors, lightColors } from '@callsign/theme';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithTheme } from '../../test/renderWithTheme';
import { Icon } from './Icon';
import type { IconName } from './Icon.types';

const NAMES: IconName[] = ['chevronLeft', 'arrowRight', 'plus', 'radio'];

function strokeOf(testId: string) {
  return screen.getByTestId(testId).querySelector('g')?.getAttribute('stroke');
}

describe('Icon', () => {
  it.each(NAMES)('draws the %s glyph', (name) => {
    renderWithTheme(<Icon name={name} testID="icon" />);

    expect(screen.getByTestId('icon').querySelectorAll('path, circle').length).toBeGreaterThan(0);
  });

  it('is 24 points square by default and takes a size', () => {
    renderWithTheme(
      <>
        <Icon name="plus" testID="default" />
        <Icon name="plus" size={32} testID="large" />
      </>,
    );

    expect(screen.getByTestId('default')).toHaveAttribute('width', '24');
    expect(screen.getByTestId('large')).toHaveAttribute('width', '32');
  });

  it('strokes in the text color by default and follows the scheme', () => {
    renderWithTheme(<Icon name="plus" testID="icon" />, { scheme: 'dark' });

    expect(strokeOf('icon')).toBe(darkColors.text);
  });

  it('takes a tone', () => {
    renderWithTheme(<Icon name="radio" tone="primary" testID="icon" />);

    expect(strokeOf('icon')).toBe(lightColors.primary);
  });

  it('is hidden from assistive tech', () => {
    renderWithTheme(<Icon name="chevronLeft" testID="icon" />);

    expect(screen.getByTestId('icon')).toHaveAttribute('aria-hidden', 'true');
  });
});
