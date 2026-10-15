import { ThemeProvider } from '@callsign/ui';
import { render, screen } from '@testing-library/react-native';

import Index from '@/app/index';

describe('Index screen', () => {
  it('renders the shared UI preview on native', async () => {
    await render(
      <ThemeProvider scheme="dark">
        <Index />
      </ThemeProvider>,
    );

    expect(screen.getByText('Callsign')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Report in' })).toBeOnTheScreen();
    expect(screen.getByText('Hold at bay four, engines off.')).toBeOnTheScreen();
  });
});
