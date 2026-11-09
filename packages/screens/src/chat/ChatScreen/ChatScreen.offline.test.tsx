import { onlineManager } from '@callsign/hooks';
import { api, net, page, server, wolf } from '@callsign/hooks/testing';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { connectionCopy } from '../../status/ConnectionToast/connectionCopy';
import { renderScreen } from '../../test/renderScreen';
import { ChatScreen } from './ChatScreen';

const tower = net('tower', { memberCount: 4 });

beforeEach(() => {
  server.use(
    http.get(api(`/rooms/${tower.id}`), () => HttpResponse.json(tower)),
    http.get(api(`/rooms/${tower.id}/messages`), () =>
      HttpResponse.json(
        page([
          {
            id: '0a00000000000000000000aa',
            roomId: tower.id,
            sender: { id: wolf.id, callsign: wolf.callsign },
            content: 'Roger. Over.',
            createdAt: '2026-10-17T22:14:00.000Z',
          },
        ]),
      ),
    ),
  );
});

afterEach(() => onlineManager.setOnline(true));

/** The fixture platform has realtime off: the net is never live. */
function renderChat() {
  renderScreen(<ChatScreen netId={tower.id} onLeft={vi.fn()} />, { session: 'signedIn' });
}

const transmit = async (text: string) => {
  const user = userEvent.setup();
  await user.type(await screen.findByRole('textbox', { name: 'Message' }), text);
  await user.click(screen.getByRole('button', { name: 'Send' }));
};

describe('ChatScreen while the net is not live', () => {
  it('says so in a status strip, not in the header', async () => {
    renderChat();
    expect(await screen.findByText('4 stations on net')).toBeInTheDocument();
    expect(await screen.findByRole('status')).toHaveTextContent(connectionCopy.noSignal);
  });

  it('says the traffic is saved when the device is offline', async () => {
    renderChat();
    await screen.findByText('Roger. Over.');
    act(() => onlineManager.setOnline(false));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(connectionCopy.offline),
    );
  });

  it('keeps a send waiting for signal, with Discard to take it back', async () => {
    renderChat();
    await screen.findByText('Roger. Over.');
    await transmit('Written offline. Over.');

    expect(await screen.findByText(/Waiting for signal/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Discard' }));
    expect(screen.queryByText('Written offline. Over.')).not.toBeInTheDocument();
  });
});
