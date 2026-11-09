import { darkColors, lightColors } from '@callsign/theme';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithTheme } from '../../test/renderWithTheme';
import { StatusToast } from './StatusToast';

describe('StatusToast', () => {
  it('says the message in a polite status region', () => {
    renderWithTheme(<StatusToast message="No signal. Showing saved traffic." />);

    const toast = screen.getByRole('status');
    expect(toast).toHaveTextContent('No signal. Showing saved traffic.');
    expect(toast).toHaveAttribute('aria-live', 'polite');
  });

  it('stands out in the warning colors and lets taps through', () => {
    renderWithTheme(<StatusToast message="Reacquiring signal" testID="toast" />);
    expect(screen.getByTestId('toast')).toHaveStyle({
      backgroundColor: lightColors.warning,
      pointerEvents: 'none',
    });
    expect(screen.getByText('Reacquiring signal')).toHaveStyle({ color: lightColors.onWarning });
  });

  it('uses the dark scheme colors in dark', () => {
    renderWithTheme(<StatusToast message="Reacquiring signal" testID="toast" />, {
      scheme: 'dark',
    });
    expect(screen.getByTestId('toast')).toHaveStyle({ backgroundColor: darkColors.warning });
  });
});
