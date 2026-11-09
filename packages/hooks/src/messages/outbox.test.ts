import type { SendMessageRequest } from '@callsign/types';
import { QueryClient } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { RealtimeSocket } from '../realtime/realtime.types';
import { wolf } from '../test/fixtures';
import type { Outbox } from './outbox';
import { createOutbox } from './outbox';
import { createPendingStore } from './pendingStore';

// Longer than `vi.waitFor` polls (50 ms), so a test can see the wait before it ends.
const WAIT_MS = 200;

type Answer = (payload: SendMessageRequest) => Promise<unknown>;

const savedAck = (payload: SendMessageRequest) =>
  Promise.resolve({
    ok: true,
    message: {
      id: `ff${String(payload.content.length).padStart(22, '0')}`,
      roomId: payload.roomId,
      sender: { id: wolf.id, callsign: wolf.callsign },
      content: payload.content,
      clientMessageId: payload.clientMessageId,
      createdAt: '2026-10-17T22:14:00.000Z',
    },
  });

const refusal = (statusCode: number, code: string) =>
  Promise.resolve({ ok: false, error: { statusCode, code, message: 'x' } });

/** A socket the test connects and answers by hand; `sent` records every emit. */
function fakeSocket() {
  const sent: SendMessageRequest[] = [];
  const fake = { connected: false, answer: savedAck as Answer };
  const socket = {
    get connected() {
      return fake.connected;
    },
    timeout: () => ({
      emitWithAck: (_event: string, payload: SendMessageRequest) => {
        sent.push(payload);
        return fake.answer(payload);
      },
    }),
  } as unknown as RealtimeSocket;
  return { socket, sent, fake };
}

let outbox: Outbox | undefined;
afterEach(() => outbox?.stop());

function setup() {
  const { socket, sent, fake } = fakeSocket();
  const pending = createPendingStore();
  outbox = createOutbox({
    pending,
    queryClient: new QueryClient(),
    getSocket: () => socket,
    reportError: vi.fn(),
    rateLimitWaitMs: WAIT_MS,
  });
  const statuses = () => pending.list('tower').map((message) => message.status);
  return { outbox, pending, sent, fake, statuses };
}

describe('createOutbox', () => {
  it('queues while disconnected, then sends oldest first on flush', async () => {
    const { outbox, sent, fake, statuses } = setup();
    outbox.send('tower', 'One. Over.');
    outbox.send('tower', 'Two. Over.');
    expect(sent).toEqual([]);
    expect(statuses()).toEqual(['queued', 'queued']);

    fake.connected = true;
    outbox.flush();
    await vi.waitFor(() => expect(statuses()).toEqual([]));
    expect(sent.map((payload) => payload.content)).toEqual(['One. Over.', 'Two. Over.']);
  });

  it('sends one at a time: a new message waits for the one on the wire', async () => {
    const { outbox, sent, fake, statuses } = setup();
    fake.connected = true;
    let release: () => void = () => undefined;
    fake.answer = (payload) =>
      new Promise((resolve) => {
        release = () => resolve(savedAck(payload));
      });

    outbox.send('tower', 'First. Over.');
    outbox.send('tower', 'Second. Over.');
    expect(sent).toHaveLength(1);
    expect(statuses()).toEqual(['queued', 'sending']);

    release();
    await vi.waitFor(() => expect(sent).toHaveLength(2));
    release();
    await vi.waitFor(() => expect(statuses()).toEqual([]));
  });

  it('waits after RATE_LIMITED, then sends again with the same key', async () => {
    const { outbox, sent, fake, statuses } = setup();
    fake.connected = true;
    fake.answer = () => refusal(429, 'RATE_LIMITED');

    outbox.send('tower', 'Over.');
    await vi.waitFor(() => expect(statuses()).toEqual(['queued']));
    fake.answer = savedAck;
    outbox.flush(); // a connect during the wait does not cut it short
    expect(sent).toHaveLength(1);

    await vi.waitFor(() => expect(statuses()).toEqual([]));
    expect(sent[1]?.clientMessageId).toBe(sent[0]?.clientMessageId);
  });

  it('marks a refused message failed and goes on with the next one', async () => {
    const { outbox, pending, fake } = setup();
    fake.connected = true;
    fake.answer = (payload) =>
      payload.content === 'Refused.' ? refusal(403, 'NOT_A_MEMBER') : savedAck(payload);

    outbox.send('tower', 'Refused.');
    outbox.send('tower', 'Fine. Over.');
    await vi.waitFor(() =>
      expect(pending.list('tower')).toEqual([
        expect.objectContaining({ content: 'Refused.', status: 'failed', error: 'NOT_A_MEMBER' }),
      ]),
    );
  });

  it('keeps a message queued when the connection drops before the ack', async () => {
    const { outbox, sent, fake, statuses } = setup();
    fake.connected = true;
    fake.answer = () => {
      fake.connected = false;
      return Promise.reject(new Error('operation has timed out'));
    };

    outbox.send('tower', 'Over.');
    await vi.waitFor(() => expect(statuses()).toEqual(['queued']));
    expect(sent).toHaveLength(1);

    fake.connected = true;
    fake.answer = savedAck;
    outbox.flush();
    await vi.waitFor(() => expect(statuses()).toEqual([]));
    expect(sent[1]?.clientMessageId).toBe(sent[0]?.clientMessageId);
  });

  it('retries only a failed message, with its key', async () => {
    const { outbox, pending, sent, fake, statuses } = setup();
    fake.connected = true;
    fake.answer = () => refusal(403, 'NOT_A_MEMBER');
    outbox.send('tower', 'Over.');
    await vi.waitFor(() => expect(statuses()).toEqual(['failed']));
    const key = pending.list('tower')[0]?.clientMessageId ?? '';

    fake.answer = savedAck;
    outbox.retry(key);
    await vi.waitFor(() => expect(statuses()).toEqual([]));
    outbox.retry(key);
    expect(sent.map((payload) => payload.clientMessageId)).toEqual([key, key]);
  });

  it('hands over after a stop during a send, so the next session still sends', async () => {
    const { outbox, pending, sent, fake } = setup();
    fake.connected = true;
    let release: () => void = () => undefined;
    fake.answer = (payload) =>
      new Promise((resolve) => {
        release = () => resolve(savedAck(payload));
      });
    outbox.send('tower', 'Before sign-out.');
    const releaseFirst = release;

    outbox.stop();
    pending.clear();
    fake.answer = savedAck;
    outbox.send('tower', 'Next session. Over.');
    expect(sent).toHaveLength(1);

    releaseFirst();
    await vi.waitFor(() =>
      expect(sent.map((payload) => payload.content)).toEqual([
        'Before sign-out.',
        'Next session. Over.',
      ]),
    );
  });

  it('stops waiting on stop (sign-out)', async () => {
    const { outbox, pending, sent, fake } = setup();
    fake.connected = true;
    fake.answer = () => refusal(429, 'RATE_LIMITED');
    outbox.send('tower', 'Over.');
    await vi.waitFor(() => expect(sent).toHaveLength(1));

    // Sign-out: the outbox stops and the pending store is emptied.
    outbox.stop();
    pending.clear();
    await new Promise((resolve) => setTimeout(resolve, WAIT_MS * 2));
    expect(sent).toHaveLength(1);
  });
});
