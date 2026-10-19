import { darkColors, fontFamilies, lightColors } from '@callsign/theme';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithTheme } from '../../test/renderWithTheme';
import { Text } from './Text';

describe('Text', () => {
  it('renders body text in the typewriter font and text color by default', () => {
    renderWithTheme(<Text>Type message. Over.</Text>);

    expect(screen.getByText('Type message. Over.')).toHaveStyle({
      fontFamily: fontFamilies.typewriter,
      color: lightColors.text,
    });
  });

  it('applies the variant typography and default tone', () => {
    renderWithTheme(<Text variant="label">Callsign</Text>);

    expect(screen.getByText('Callsign')).toHaveStyle({
      fontFamily: fontFamilies.stencilBold,
      textTransform: 'uppercase',
      color: lightColors.label,
    });
  });

  it('follows the theme scheme', () => {
    renderWithTheme(<Text variant="meta">22:14</Text>, { scheme: 'dark' });

    expect(screen.getByText('22:14')).toHaveStyle({ color: darkColors.textMuted });
  });

  it('lets tone override the variant color', () => {
    renderWithTheme(
      <Text variant="body" tone="dangerText">
        Callsign taken
      </Text>,
    );

    expect(screen.getByText('Callsign taken')).toHaveStyle({ color: lightColors.dangerText });
  });

  it('passes accessibility props through', () => {
    renderWithTheme(
      <Text variant="title" role="heading">
        Nets
      </Text>,
    );

    expect(screen.getByRole('heading', { name: 'Nets' })).toBeInTheDocument();
  });
});
