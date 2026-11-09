import type { MessageDto, SendMessageRequest } from '@callsign/types';
import { QueryClient } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createApiClient } from '../api/createApiClient';
import { createSessionStore } from '../session/sessionStore';
import { authResponse, webPlatform, wolf } from '../test/fixtures';
import type { SocketTestServer } from '../test/socketServer';
import { startSocketTestServer } from '../test/socketServer';
import { createRealtime } from './createRealtime';

let sockets: SocketTestServer;
let stop: (() => void) | undefined;
/** Every `message:send` the server received, in order. */
let received: SendMessageRequest[];

beforeEach(async () => {
  received = [];
  sockets = await startSocketTestServer();
  sockets.io.on('connection', (socket) => {
    socket.on('message:send', (payload, ack) => {
      received.push(payload);
      const message: MessageDto = {
        id: `ff${String(received.length).padStart(22, '0')}`,
        roomId: payload.roomId,
        sender: { id: wolf.id, callsign: wolf.callsign },
        content: payload.content,
        clientMessageId: payload.clientMessageId,
        createdAt: '2026-10-17T22:14:00.000Z',
      };
      ack({ ok: true, message });
    });
  });
});

afterEach(async () => {
  stop?.();
  stop = undefined;
  await sockets.close();
});

/** Signed in, with the realtime layer started but not connected yet. */
async function signedInNotYetConnected() {
  const apiClient = createApiClient(webPlatform);
  const queryClient = new QueryClient();
  const session = createSessionStore(apiClient, queryClient);
  await session.signIn(authResponse('access-1'));
  const realtime = createRealtime({
    api: apiClient,
    queryClient,
    session,
    createSocket: sockets.createSocket,
    reportError: vi.fn(),
  });
  stop = realtime.start();
  return realtime;
}

describe('createRealtime: outbox', () => {
  it('sends what was written before the socket connected, in order, once connected', async () => {
    const realtime = await signedInNotYetConnected();
    expect(realtime.getStatus()).toBe('connecting');

    realtime.send('tower', 'One. Over.');
    realtime.send('tower', 'Two. Over.');
    expect(realtime.pending.list('tower').map((message) => message.status)).toEqual([
      'queued',
      'queued',
    ]);

    await vi.waitFor(() => expect(realtime.pending.list('tower')).toEqual([]));
    expect(received.map((payload) => payload.content)).toEqual(['One. Over.', 'Two. Over.']);
  });
});
