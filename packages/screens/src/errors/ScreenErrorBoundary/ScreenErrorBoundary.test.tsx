import type { ErrorReporter } from '@callsign/hooks';
import { webPlatform } from '@callsign/hooks/testing';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderScreen } from '../../test/renderScreen';
import { ScreenErrorBoundary } from './ScreenErrorBoundary';

let reportError: ReturnType<typeof vi.fn<ErrorReporter>>;

beforeEach(() => {
  reportError = vi.fn<ErrorReporter>();
  // React logs every caught error to the console; the reporter is what this test checks.
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

const platform = () => ({ ...webPlatform, reportError });

/** Throws on its first renders while `crash.on` is set, like a bug that a retry gets past. */
const crash = { on: true };
function Fragile({ label }: { label: string }) {
  if (crash.on) throw new TypeError('x is undefined');
  return <p>{label}</p>;
}

describe('ScreenErrorBoundary', () => {
  it('shows the crash screen, reports the error with its component stack, and retries', async () => {
    crash.on = true;
    renderScreen(
      <ScreenErrorBoundary>
        <Fragile label="Back on air" />
      </ScreenErrorBoundary>,
      { platform: platform() },
    );

    expect(await screen.findByText('The fault was logged. Try again. Over.')).toBeInTheDocument();
    expect(reportError).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ message: 'x is undefined' }),
      { source: 'render', componentStack: expect.stringContaining('Fragile') },
    );

    crash.on = false;
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Back on air')).toBeInTheDocument();
  });

  it('starts over when a reset key changes', async () => {
    crash.on = true;
    /** Like the web chat route: the net id comes from outside the boundary. */
    function Panel() {
      const [netId, setNetId] = useState('tower');
      return (
        <>
          <button type="button" onClick={() => setNetId('ground')}>
            Open ground
          </button>
          <ScreenErrorBoundary resetKeys={[netId]}>
            <Fragile label={`Net ${netId}`} />
          </ScreenErrorBoundary>
        </>
      );
    }
    renderScreen(<Panel />, { platform: platform() });
    await screen.findByRole('button', { name: 'Try again' });

    crash.on = false;
    await userEvent.click(screen.getByRole('button', { name: 'Open ground' }));
    expect(await screen.findByText('Net ground')).toBeInTheDocument();
  });

  it('refetches a query that crashed it, instead of throwing its cached error again', async () => {
    let calls = 0;
    function Traffic() {
      const { data } = useQuery({
        queryKey: ['traffic'],
        queryFn: () => {
          calls += 1;
          return calls === 1
            ? Promise.reject(new TypeError('bad parse'))
            : Promise.resolve('Over.');
        },
        throwOnError: true,
      });
      return <p>{data ?? 'Loading'}</p>;
    }
    renderScreen(
      <ScreenErrorBoundary>
        <Traffic />
      </ScreenErrorBoundary>,
      // After the restore: signing in clears the cache, which would refetch before the crash.
      { platform: platform(), session: 'signedIn' },
    );

    await userEvent.click(await screen.findByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Over.')).toBeInTheDocument();
    expect(calls).toBe(2);
  });
});
