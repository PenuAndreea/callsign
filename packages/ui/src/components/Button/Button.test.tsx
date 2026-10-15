import { darkColors, lightColors } from '@callsign/theme';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { renderWithTheme } from '../../test/renderWithTheme';
import { Button } from './Button';

// react-native-web sets `pointer-events: none` on disabled buttons; click anyway to prove onPress stays silent.
const forceClick = (element: Element) => userEvent.setup({ pointerEventsCheck: 0 }).click(element);

describe('Button', () => {
  it('renders an accessible button named by its label', () => {
    renderWithTheme(<Button label="Report in" onPress={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Report in' })).toBeInTheDocument();
  });

  it('calls onPress when pressed', async () => {
    const onPress = vi.fn();
    renderWithTheme(<Button label="Report in" onPress={onPress} />);

    await userEvent.click(screen.getByRole('button', { name: 'Report in' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('fills the primary variant with the theme primary color', () => {
    renderWithTheme(<Button label="Report in" onPress={vi.fn()} />, { scheme: 'dark' });

    expect(screen.getByRole('button')).toHaveStyle({ backgroundColor: darkColors.primary });
    expect(screen.getByText('Report in')).toHaveStyle({ color: darkColors.onPrimary });
  });

  it('outlines the secondary variant', () => {
    renderWithTheme(<Button label="Leave" variant="secondary" onPress={vi.fn()} />);

    expect(screen.getByRole('button')).toHaveStyle({ borderColor: lightColors.primary });
    expect(screen.getByText('Leave')).toHaveStyle({ color: lightColors.primary });
  });

  it('underlines the link variant', () => {
    renderWithTheme(<Button label="New station? Register here" variant="link" onPress={vi.fn()} />);

    expect(screen.getByText('New station? Register here')).toHaveStyle({
      textDecorationLine: 'underline',
    });
  });

  it('ignores presses and reports disabled when disabled', async () => {
    const onPress = vi.fn();
    renderWithTheme(<Button label="Report in" onPress={onPress} disabled />);

    await forceClick(screen.getByRole('button'));

    expect(onPress).not.toHaveBeenCalled();
    expect(screen.getByRole('button')).toHaveAttribute('aria-disabled', 'true');
  });

  it('shows a spinner, keeps its name and blocks presses while loading', async () => {
    const onPress = vi.fn();
    renderWithTheme(<Button label="Report in" onPress={onPress} loading />);

    const button = screen.getByRole('button', { name: 'Report in' });
    await forceClick(button);

    expect(onPress).not.toHaveBeenCalled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByText('Report in')).not.toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('prefers an explicit accessibility label', () => {
    renderWithTheme(<Button label="TX" aria-label="Send" onPress={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Send' })).toBeInTheDocument();
  });
});
