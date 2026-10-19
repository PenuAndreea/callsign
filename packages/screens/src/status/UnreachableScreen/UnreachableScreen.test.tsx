import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { renderScreen } from '../../test/renderScreen';
import { UnreachableScreen } from './UnreachableScreen';

describe('UnreachableScreen', () => {
  it('explains the problem and retries', async () => {
    const onRetry = vi.fn();
    renderScreen(<UnreachableScreen onRetry={onRetry} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Check your connection');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
