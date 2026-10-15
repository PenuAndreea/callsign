import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { PressableBase } from './PressableBase';

describe('PressableBase', () => {
  it('enters the pressed state as soon as the pointer goes down, without the web delay', async () => {
    const onPressIn = vi.fn();
    render(<PressableBase role="button" aria-label="Back" onPressIn={onPressIn} />);

    await userEvent
      .setup()
      .pointer({ keys: '[MouseLeft>]', target: screen.getByRole('button', { name: 'Back' }) });

    // No waiting: with react-native-web's default 50 ms delay this would still be 0.
    expect(onPressIn).toHaveBeenCalledTimes(1);
  });

  it('passes props through to Pressable', async () => {
    const onPress = vi.fn();
    render(<PressableBase role="button" aria-label="Back" onPress={onPress} />);

    await userEvent.click(screen.getByRole('button', { name: 'Back' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
