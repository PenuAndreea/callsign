import { darkColors, lightColors, sizes } from '@callsign/theme';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithTheme } from '../../test/renderWithTheme';
import { StatusDot } from './StatusDot';

describe('StatusDot', () => {
  it('lights up in lampOn when on', () => {
    renderWithTheme(<StatusDot on testID="dot" />);

    expect(screen.getByTestId('dot')).toHaveStyle({
      backgroundColor: lightColors.lampOn,
      width: `${sizes.lamp}px`,
    });
  });

  it('uses lampOff when off and follows the scheme', () => {
    renderWithTheme(<StatusDot on={false} testID="dot" />, { scheme: 'dark' });

    expect(screen.getByTestId('dot')).toHaveStyle({ backgroundColor: darkColors.lampOff });
  });

  it('is hidden from assistive tech', () => {
    renderWithTheme(<StatusDot on testID="dot" />);

    expect(screen.getByTestId('dot')).toHaveAttribute('aria-hidden', 'true');
  });
});
