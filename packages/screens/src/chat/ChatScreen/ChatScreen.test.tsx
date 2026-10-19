import type { SocketTestServer } from '@callsign/hooks/testing';
import {
  api,
  apiError,
  net,
  page,
  server,
  startSocketTestServer,
  webPlatform,
  wolf,
} from '@callsign/hooks/testing';
import type { MessageDto, SendMessageAck, SendMessageRequest } from '@callsign/types';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderScreen } from '../../test/renderScreen';
import { ChatScreen } from './ChatScreen';

const tower = net('tower', { memberCount: 4 });
const saved = (id: string, content: string, sender = { id: wolf.id, callsign: 'wolf-2' }) =>
  ({
    id,
    roomId: tower.id,
    sender,
    content,
    createdAt: '2026-10-17T22:14:00.000Z',
  }) satisfies MessageDto;

let sockets: SocketTestServer;
let onSend: (payload: SendMessageRequest, ack: (res: SendMessageAck) => void) => void;

beforeEach(async () => {
  sockets = await startSocketTestServer();
  onSend = (payload, ack) =>
    ack({
      ok: true,
      message: { ...saved('ff00000000000000000000ff', payload.content), ...payload },
    });
  sockets.io.on('connection', (socket) => {
    socket.on('message:send', (payload, ack) => onSend(payload, ack));
  });
  server.use(
    http.get(api(`/rooms/${tower.id}`), () => HttpResponse.json(tower)),
    http.get(api(`/rooms/${tower.id}/messages`), () =>
      HttpResponse.json(
        page([
          saved('0b00000000000000000000bb', 'Roger. Over.'),
          saved('0a00000000000000000000aa', 'Wolf Two, cleared to land.', {
            id: 'tower-ops',
            callsign: 'twr-ops',
          }),
        ]),
      ),
    ),
  );
});

afterEach(async () => {
  await sockets.close();
});

function renderChat(props: { onBack?: () => void; onLeft?: () => void } = {}) {
  const onLeft = props.onLeft ?? vi.fn();
  renderScreen(<ChatScreen netId={tower.id} onLeft={onLeft} {...props} />, {
    session: 'signedIn',
    platform: { ...webPlatform, createSocket: sockets.createSocket },
  });
  return { onLeft };
}

const transmit = async (text: string) => {
  const user = userEvent.setup();
  await user.type(await screen.findByRole('textbox', { name: 'Message' }), text);
  await user.click(screen.getByRole('button', { name: 'Send' }));
};

describe('ChatScreen', () => {
  it('shows the header and the traffic, own and incoming', async () => {
    renderChat({ onBack: vi.fn() });

    expect(await screen.findByText('tower')).toBeInTheDocument();
    expect(await screen.findByText('4 stations on net')).toBeInTheDocument();
    expect(await screen.findByText('Wolf Two, cleared to land.')).toBeInTheDocument();
    expect(screen.getByText('twr-ops')).toBeInTheDocument();
    expect(screen.getByText('Start of the net')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
  });

  it('has no back button next to the sidebar', async () => {
    renderChat();
    await screen.findByText('Roger. Over.');
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument();
  });

  it('transmits, clears the composer and shows the saved message', async () => {
    renderChat();
    await screen.findByText('4 stations on net');
    await transmit('Wolf Two on final. Over.');

    expect(await screen.findByText('Wolf Two on final. Over.')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Message' })).toHaveValue('');
    await waitFor(() => expect(screen.queryByText(/Sending/)).not.toBeInTheDocument());
  });

  it('shows a refused send as not sent, and retries it', async () => {
    let attempts = 0;
    onSend = (payload, ack) => {
      attempts += 1;
      if (attempts === 1) {
        ack({ ok: false, error: { statusCode: 429, code: 'RATE_LIMITED', message: 'x' } });
        return;
      }
      ack({
        ok: true,
        message: { ...saved('ff00000000000000000000ff', payload.content), ...payload },
      });
    };
    renderChat();
    await screen.findByText('4 stations on net');
    await transmit('Over.');

    expect(await screen.findByText(/Not sent/)).toBeInTheDocument();
    expect(screen.getByText(/Stand by a few seconds/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(screen.queryByText(/Not sent/)).not.toBeInTheDocument());
    expect(attempts).toBe(2);
  });

  it('adds messages from other stations live', async () => {
    renderChat();
    await screen.findByText('Roger. Over.');
    // Live once the subtitle drops "· reconnecting".
    await screen.findByText('4 stations on net');

    sockets.io.emit(
      'message:new',
      saved('ff00000000000000000000ff', 'Tower here. Over.', { id: 'x', callsign: 'eagle-1' }),
    );
    expect(await screen.findByText('Tower here. Over.')).toBeInTheDocument();
  });

  it('offers to join a net the user is not on', async () => {
    let member = false;
    server.use(
      http.get(api(`/rooms/${tower.id}/messages`), () =>
        member
          ? HttpResponse.json(page([saved('0a00000000000000000000aa', 'Welcome. Over.')]))
          : apiError(403, 'NOT_A_MEMBER'),
      ),
      http.put(api(`/rooms/${tower.id}/members/me`), () => {
        member = true;
        return HttpResponse.json({ ...tower, memberCount: 5 });
      }),
    );
    renderChat();
    // Connecting refetches the failed history, which swaps the offer for a spinner meanwhile.
    await screen.findByText('4 stations on net');

    await userEvent.click(await screen.findByRole('button', { name: 'Join the net' }));
    expect(await screen.findByText('Welcome. Over.')).toBeInTheDocument();
  });

  it('says when the net is quiet', async () => {
    server.use(http.get(api(`/rooms/${tower.id}/messages`), () => HttpResponse.json(page([]))));
    renderChat();
    expect(await screen.findByText('No traffic yet. Open the net. Over.')).toBeInTheDocument();
  });

  it('leaves the net', async () => {
    server.use(
      http.delete(
        api(`/rooms/${tower.id}/members/me`),
        () => new HttpResponse(null, { status: 204 }),
      ),
    );
    const { onLeft } = renderChat();

    await userEvent.click(await screen.findByRole('button', { name: 'Leave' }));
    await waitFor(() => expect(onLeft).toHaveBeenCalledOnce());
  });
});
