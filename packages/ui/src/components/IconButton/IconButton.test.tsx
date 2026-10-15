import { darkColors, lightColors, sizes } from '@callsign/theme';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { renderWithTheme } from '../../test/renderWithTheme';
import { IconButton } from './IconButton';

describe('IconButton', () => {
  it('is a button named by its aria-label, not by its glyph', () => {
    renderWithTheme(<IconButton icon="chevronLeft" aria-label="Back" onPress={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
  });

  it('calls onPress when pressed', async () => {
    const onPress = vi.fn();
    renderWithTheme(<IconButton icon="chevronLeft" aria-label="Back" onPress={onPress} />);

    await userEvent.click(screen.getByRole('button', { name: 'Back' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders the surface variant as a raised square at least one touch target wide', () => {
    renderWithTheme(<IconButton icon="chevronLeft" aria-label="Back" onPress={vi.fn()} />);

    expect(screen.getByRole('button')).toHaveStyle({
      width: `${sizes.touch}px`,
      height: `${sizes.touch}px`,
      backgroundColor: lightColors.surface,
    });
  });

  it('renders the primary variant round and filled, with text in onPrimary', () => {
    renderWithTheme(
      <IconButton text="TX" variant="primary" aria-label="Send" onPress={vi.fn()} />,
      {
        scheme: 'dark',
      },
    );

    expect(screen.getByRole('button', { name: 'Send' })).toHaveStyle({
      width: `${sizes.tx}px`,
      backgroundColor: darkColors.primary,
    });
    expect(screen.getByText('TX')).toHaveStyle({ color: darkColors.onPrimary });
  });

  it('sinks the surface variant while held down', async () => {
    const user = userEvent.setup();
    renderWithTheme(<IconButton icon="chevronLeft" aria-label="Back" onPress={vi.fn()} />);
    const button = screen.getByRole('button', { name: 'Back' });

    await user.pointer({ keys: '[MouseLeft>]', target: button });
    expect(button).toHaveStyle({
      backgroundColor: lightColors.surfaceInset,
      transform: 'scale(0.96)',
    });

    await user.pointer({ keys: '[/MouseLeft]', target: button });
    await waitFor(() => expect(button).toHaveStyle({ backgroundColor: lightColors.surface }));
  });

  it('ignores presses and reports disabled when disabled', async () => {
    const onPress = vi.fn();
    renderWithTheme(
      <IconButton text="TX" variant="primary" aria-label="Send" onPress={onPress} disabled />,
    );

    // react-native-web sets `pointer-events: none` on disabled buttons; click anyway.
    await userEvent.setup({ pointerEventsCheck: 0 }).click(screen.getByRole('button'));

    expect(onPress).not.toHaveBeenCalled();
    expect(screen.getByRole('button')).toHaveAttribute('aria-disabled', 'true');
  });
});
