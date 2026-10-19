import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { renderScreen } from '../../test/renderScreen';
import { CrashScreen } from './CrashScreen';

describe('CrashScreen', () => {
  it('says something broke, without details, and retries', async () => {
    const onRetry = vi.fn();
    renderScreen(<CrashScreen onRetry={onRetry} />);

    expect(screen.getByRole('alert')).toHaveTextContent('The fault was logged');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledOnce();
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument();
  });

  it('offers a way back when given one', async () => {
    const onBack = vi.fn();
    renderScreen(<CrashScreen onRetry={vi.fn()} onBack={onBack} />);

    await userEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalledOnce();
  });
});
