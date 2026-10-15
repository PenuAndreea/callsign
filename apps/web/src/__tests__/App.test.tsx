import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import App from '../App';

describe('App', () => {
  it('renders the shared UI preview inside the theme', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: /callsign/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Report in' })).toBeInTheDocument();
    expect(screen.getByText('Hold at bay four, engines off.')).toBeInTheDocument();
  });
});
