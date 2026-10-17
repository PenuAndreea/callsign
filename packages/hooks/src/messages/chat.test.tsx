// @vitest-environment jsdom
import type { MessageDto, SendMessageAck, SendMessageRequest } from '@callsign/types';
import { act, cleanup, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useRealtimeStatus } from '../realtime/useRealtimeStatus';
import { apiError, authResponse, net, page, webPlatform, wolf } from '../test/fixtures';
import { renderHookWithApiProvider } from '../test/renderHookWithApiProvider';
import { api, server } from '../test/server';
import type { SocketTestServer } from '../test/socketServer';
import { startSocketTestServer } from '../test/socketServer';
import { useNetMessages } from './useNetMessages';
import { useSendMessage } from './useSendMessage';

const tower = net('tower');
const saved = (id: string, content: string, overrides: Partial<MessageDto> = {}): MessageDto => ({
  id,
  roomId: tower.id,
  sender: { id: wolf.id, callsign: wolf.callsign },
  content,
  createdAt: '2026-10-17T22:14:00.000Z',
  ...overrides,
});

let sockets: SocketTestServer;
/** What the fake API does with `message:send`; the default saves it as message `ff…`. */
let onSend: (payload: SendMessageRequest, ack: (res: SendMessageAck) => void) => void;

beforeEach(async () => {
  sockets = await startSocketTestServer();
  onSend = (payload, ack) =>
    ack({ ok: true, message: saved('ff00000000000000000000ff', payload.content, payload) });
  sockets.io.on('connection', (socket) => {
    socket.on('message:send', (payload, ack) => onSend(payload, ack));
  });
  server.use(
    http.post(api('/auth/refresh'), () => HttpResponse.json(authResponse('access-1'))),
    http.get(api(`/rooms/${tower.id}/messages`), () =>
      HttpResponse.json(page([saved('0a00000000000000000000aa', 'Radio check. Over.')])),
    ),
  );
});

afterEach(async () => {
  cleanup();
  await sockets.close();
});

async function renderChat() {
  const rendered = renderHookWithApiProvider(
    () => ({
      chat: useNetMessages(tower.id),
      actions: useSendMessage(tower.id),
      status: useRealtimeStatus(),
    }),
    { ...webPlatform, createSocket: sockets.createSocket },
  );
  await waitFor(() => expect(rendered.result.current.status).toBe('connected'));
  await waitFor(() => expect(rendered.result.current.chat.entries).toHaveLength(1));
  return rendered;
}

const contents = (entries: { type: string; key: string }[]) =>
  entries.map((entry) => `${entry.type}:${entry.key}`);

describe('chat', () => {
  it('loads the history newest first', async () => {
    const { result } = await renderChat();
    expect(result.current.chat.entries[0]).toMatchObject({
      type: 'message',
      message: { content: 'Radio check. Over.' },
    });
  });

  it('shows a send as pending, then as the saved message', async () => {
    let release: () => void = () => undefined;
    onSend = (payload, ack) => {
      release = () =>
        ack({ ok: true, message: saved('ff00000000000000000000ff', payload.content, payload) });
    };
    const { result } = await renderChat();

    act(() => result.current.actions.send('Wolf Two on final. Over.'));
    await waitFor(() => expect(result.current.chat.entries[0]?.type).toBe('pending'));
    expect(result.current.chat.entries[0]).toMatchObject({
      pending: { content: 'Wolf Two on final. Over.', status: 'sending' },
    });

    act(() => release());
    await waitFor(() =>
      expect(contents(result.current.chat.entries)).toEqual([
        'message:ff00000000000000000000ff',
        'message:0a00000000000000000000aa',
      ]),
    );
  });

  it('sends a UUID key and keeps one copy when the broadcast follows the ack', async () => {
    let payloadSeen: SendMessageRequest | undefined;
    onSend = (payload, ack) => {
      payloadSeen = payload;
      const message = saved('ff00000000000000000000ff', payload.content, payload);
      ack({ ok: true, message });
      sockets.io.emit('message:new', message);
    };
    const { result } = await renderChat();

    act(() => result.current.actions.send('Over.'));
    await waitFor(() => expect(result.current.chat.entries).toHaveLength(2));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(result.current.chat.entries).toHaveLength(2);
    expect(payloadSeen?.clientMessageId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('resolves the pending message from the broadcast when the ack never comes', async () => {
    onSend = (payload) => {
      sockets.io.emit('message:new', saved('ff00000000000000000000ff', payload.content, payload));
    };
    const { result } = await renderChat();

    act(() => result.current.actions.send('Over.'));
    await waitFor(() =>
      expect(contents(result.current.chat.entries)).toEqual([
        'message:ff00000000000000000000ff',
        'message:0a00000000000000000000aa',
      ]),
    );
  });

  it('marks a refused send as failed, and a retry reuses its key', async () => {
    const keys: (string | undefined)[] = [];
    onSend = (payload, ack) => {
      keys.push(payload.clientMessageId);
      if (keys.length === 1) {
        ack({ ok: false, error: { statusCode: 429, code: 'RATE_LIMITED', message: 'x' } });
        return;
      }
      ack({ ok: true, message: saved('ff00000000000000000000ff', payload.content, payload) });
    };
    const { result } = await renderChat();

    act(() => result.current.actions.send('Over.'));
    await waitFor(() =>
      expect(result.current.chat.entries[0]).toMatchObject({
        type: 'pending',
        pending: { status: 'failed', error: 'RATE_LIMITED' },
      }),
    );
    const key = result.current.chat.entries[0]?.key ?? '';

    act(() => result.current.actions.retry(key));
    await waitFor(() => expect(result.current.chat.entries[0]?.type).toBe('message'));
    expect(keys).toEqual([key, key]);
  });

  it('discards a failed send', async () => {
    onSend = (_payload, ack) =>
      ack({ ok: false, error: { statusCode: 403, code: 'NOT_A_MEMBER', message: 'x' } });
    const { result } = await renderChat();

    act(() => result.current.actions.send('Over.'));
    await waitFor(() => expect(result.current.chat.entries[0]?.type).toBe('pending'));
    await waitFor(() =>
      expect(result.current.chat.entries[0]).toMatchObject({ pending: { status: 'failed' } }),
    );
    act(() => result.current.actions.discard(result.current.chat.entries[0]?.key ?? ''));
    expect(result.current.chat.entries).toHaveLength(1);
  });

  it('adds messages from other stations live', async () => {
    const { result } = await renderChat();

    act(() => {
      sockets.io.emit(
        'message:new',
        saved('ff00000000000000000000ff', 'Tower here. Over.', {
          sender: { id: 'other', callsign: 'eagle-1' },
        }),
      );
    });
    await waitFor(() =>
      expect(result.current.chat.entries[0]).toMatchObject({
        message: { content: 'Tower here. Over.' },
      }),
    );
  });

  it('reports a net the user is not on', async () => {
    server.use(http.get(api(`/rooms/${tower.id}/messages`), () => apiError(403, 'NOT_A_MEMBER')));
    const { result } = renderHookWithApiProvider(() => useNetMessages(tower.id));
    await waitFor(() => expect(result.current.error).toMatchObject({ code: 'NOT_A_MEMBER' }));
  });
});
