import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithTheme } from '../../test/renderWithTheme';
import { Masthead } from './Masthead';

describe('Masthead', () => {
  it('shows the title as the page heading, with the logo', () => {
    const { container } = renderWithTheme(<Masthead title="Callsign" />);

    expect(screen.getByRole('heading', { level: 1, name: 'Callsign' })).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('shows the subtitle when given', () => {
    renderWithTheme(<Masthead title="Register" subtitle="Join the net as a new station" />);

    expect(screen.getByText('Join the net as a new station')).toBeInTheDocument();
  });

  it('leaves the subtitle out when not given', () => {
    renderWithTheme(<Masthead title="Callsign" />);

    expect(screen.getAllByText(/./)).toHaveLength(1);
  });
});
