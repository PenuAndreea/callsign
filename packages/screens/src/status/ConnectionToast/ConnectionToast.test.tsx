import type { Connectivity } from '@callsign/hooks';
import { useConnectivity } from '@callsign/hooks';
import { ThemeProvider } from '@callsign/ui';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ConnectionToast } from './ConnectionToast';
import { connectionCopy, TOAST_DELAY_MS } from './connectionCopy';

vi.mock('@callsign/hooks', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useConnectivity: vi.fn(),
}));

function renderToast(initial: Connectivity) {
  vi.mocked(useConnectivity).mockReturnValue(initial);
  const view = render(
    <ThemeProvider>
      <ConnectionToast bottom={0} />
    </ThemeProvider>,
  );
  const changeTo = (next: Connectivity) => {
    vi.mocked(useConnectivity).mockReturnValue(next);
    view.rerender(
      <ThemeProvider>
        <ConnectionToast bottom={0} />
      </ThemeProvider>,
    );
  };
  return { changeTo };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('ConnectionToast', () => {
  it('shows nothing while connected', () => {
    renderToast('connected');
    act(() => vi.advanceTimersByTime(TOAST_DELAY_MS * 2));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('waits before saying the net is down, so connecting never flashes it', () => {
    const { changeTo } = renderToast('noSignal');
    act(() => vi.advanceTimersByTime(TOAST_DELAY_MS - 1));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    changeTo('connected');
    act(() => vi.advanceTimersByTime(TOAST_DELAY_MS));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('says no signal once it lasts, and the saved traffic once offline', () => {
    const { changeTo } = renderToast('noSignal');
    act(() => vi.advanceTimersByTime(TOAST_DELAY_MS));
    expect(screen.getByRole('status')).toHaveTextContent(connectionCopy.noSignal);

    changeTo('offline');
    act(() => vi.advanceTimersByTime(TOAST_DELAY_MS));
    expect(screen.getByRole('status')).toHaveTextContent(connectionCopy.offline);
  });

  it('goes away as soon as the net is live again', () => {
    const { changeTo } = renderToast('offline');
    act(() => vi.advanceTimersByTime(TOAST_DELAY_MS));
    expect(screen.getByRole('status')).toBeInTheDocument();

    changeTo('connected');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
