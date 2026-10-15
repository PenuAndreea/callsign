import { darkColors, lightColors } from '@callsign/theme';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithTheme } from '../../test/renderWithTheme';
import { Text } from '../Text/Text';
import { Card } from './Card';

describe('Card', () => {
  it('renders its children on the surface color', () => {
    renderWithTheme(
      <Card testID="card">
        <Text>Tower and ground</Text>
      </Card>,
    );

    expect(screen.getByText('Tower and ground')).toBeInTheDocument();
    expect(screen.getByTestId('card')).toHaveStyle({ backgroundColor: lightColors.surface });
  });

  it('follows the theme scheme', () => {
    renderWithTheme(<Card testID="card" />, { scheme: 'dark' });

    expect(screen.getByTestId('card')).toHaveStyle({ backgroundColor: darkColors.surface });
  });

  it('merges a layout style after its own', () => {
    renderWithTheme(<Card testID="card" style={{ marginTop: 24 }} />);

    expect(screen.getByTestId('card')).toHaveStyle({ marginTop: '24px' });
  });
});
