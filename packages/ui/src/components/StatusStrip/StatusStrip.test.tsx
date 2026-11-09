import { darkColors, lightColors } from '@callsign/theme';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithTheme } from '../../test/renderWithTheme';
import { StatusStrip } from './StatusStrip';

describe('StatusStrip', () => {
  it('says the message in a polite status region', () => {
    renderWithTheme(<StatusStrip message="No signal. Showing saved traffic." />);

    const strip = screen.getByRole('status');
    expect(strip).toHaveTextContent('No signal. Showing saved traffic.');
    expect(strip).toHaveAttribute('aria-live', 'polite');
  });

  it('sits on surfaceInset and follows the scheme', () => {
    renderWithTheme(<StatusStrip message="Reacquiring signal" testID="strip" />);
    expect(screen.getByTestId('strip')).toHaveStyle({ backgroundColor: lightColors.surfaceInset });
  });

  it('uses the dark scheme colors in dark', () => {
    renderWithTheme(<StatusStrip message="Reacquiring signal" testID="strip" />, {
      scheme: 'dark',
    });
    expect(screen.getByTestId('strip')).toHaveStyle({ backgroundColor: darkColors.surfaceInset });
  });
});
