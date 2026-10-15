import { lightColors } from '@callsign/theme';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithTheme } from '../../test/renderWithTheme';
import { SectionLabel } from './SectionLabel';

describe('SectionLabel', () => {
  it('is a level 2 heading', () => {
    renderWithTheme(<SectionLabel title="Open to join" />);

    expect(screen.getByRole('heading', { level: 2, name: 'Open to join' })).toBeInTheDocument();
  });

  it('renders as a muted uppercase label', () => {
    renderWithTheme(<SectionLabel title="Joined" />);

    expect(screen.getByText('Joined')).toHaveStyle({
      color: lightColors.textMuted,
      textTransform: 'uppercase',
    });
  });
});
