import { onlineManager, useSendMessage } from '@callsign/hooks';
import { api, net, page, server } from '@callsign/hooks/testing';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderScreen } from '../../test/renderScreen';
import { unsentLossMessage } from './LogoutConfirm';
import { NetsScreen } from './NetsScreen';

const tower = net('tower', { memberCount: 4 });
const ground = net('ground', { isMember: false, memberCount: 0 });

let logouts: number;

beforeEach(() => {
  logouts = 0;
  server.use(
    http.get(api('/rooms'), ({ request }) =>
      HttpResponse.json(
        page(new URL(request.url).searchParams.get('scope') === 'joined' ? [tower] : [ground]),
      ),
    ),
    http.post(api('/auth/logout'), () => {
      logouts += 1;
      return new HttpResponse(null, { status: 204 });
    }),
  );
});

afterEach(() => onlineManager.setOnline(true));

/** Queues one message (realtime is off in the fixture, so it stays unsent). */
function UnsentMessage() {
  const { send } = useSendMessage(tower.id);
  useEffect(() => send('Written offline. Over.'), [send]);
  return null;
}

function renderNets(withUnsent = false) {
  renderScreen(
    <>
      <NetsScreen onOpenNet={vi.fn()} onNewNet={vi.fn()} />
      {withUnsent && <UnsentMessage />}
    </>,
    { session: 'signedIn' },
  );
}

const disabled = (name: string | RegExp) =>
  expect(screen.getByRole('button', { name })).toHaveAttribute('aria-disabled', 'true');

describe('NetsScreen offline', () => {
  it('turns off the actions that need the API, and back on', async () => {
    renderNets();
    await screen.findByRole('button', { name: 'Join ground' });

    act(() => onlineManager.setOnline(false));
    disabled('Join ground');
    disabled('New net');

    act(() => onlineManager.setOnline(true));
    expect(screen.getByRole('button', { name: 'New net' })).not.toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('logs out at once when nothing is unsent', async () => {
    renderNets();
    await userEvent.click(await screen.findByRole('button', { name: 'Log out' }));
    await vi.waitFor(() => expect(logouts).toBe(1));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('asks before logging out with unsent messages, and can be cancelled', async () => {
    renderNets(true);
    await userEvent.click(await screen.findByRole('button', { name: 'Log out' }));

    expect(screen.getByRole('alert')).toHaveTextContent(unsentLossMessage(1));
    expect(logouts).toBe(0);
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Log out' }));
    await userEvent.click(screen.getByRole('button', { name: 'Log out anyway' }));
    await vi.waitFor(() => expect(logouts).toBe(1));
  });
});

describe('unsentLossMessage', () => {
  it('counts one or more messages', () => {
    expect(unsentLossMessage(1)).toBe('1 message not sent will be lost. Log out anyway?');
    expect(unsentLossMessage(3)).toBe('3 messages not sent will be lost. Log out anyway?');
  });
});
