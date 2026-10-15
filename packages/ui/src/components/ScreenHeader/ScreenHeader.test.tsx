import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { renderWithTheme } from '../../test/renderWithTheme';
import { Button } from '../Button/Button';
import { ScreenHeader } from './ScreenHeader';

describe('ScreenHeader', () => {
  it('shows the title as the page heading with its meta lines', () => {
    renderWithTheme(
      <ScreenHeader title="Tower and ground" eyebrow="Net" subtitle="4 stations on net" />,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Tower and ground' })).toBeInTheDocument();
    expect(screen.getByText('Net')).toBeInTheDocument();
    expect(screen.getByText('4 stations on net')).toBeInTheDocument();
  });

  it('has no back button unless onBack is given', () => {
    renderWithTheme(<ScreenHeader title="Nets" />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('calls onBack from a named back button', async () => {
    const onBack = vi.fn();
    renderWithTheme(<ScreenHeader title="Register" onBack={onBack} backLabel="Back to sign in" />);

    await userEvent.click(screen.getByRole('button', { name: 'Back to sign in' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('renders the action slot', () => {
    renderWithTheme(
      <ScreenHeader
        title="Tower and ground"
        action={<Button label="Leave" variant="secondary" onPress={vi.fn()} />}
      />,
    );

    expect(screen.getByRole('button', { name: 'Leave' })).toBeInTheDocument();
  });

  it('keeps a truncated title on one line', () => {
    renderWithTheme(<ScreenHeader title="A very long net name" truncateTitle />);

    expect(screen.getByRole('heading')).toHaveStyle({ whiteSpace: 'nowrap' });
  });
});
