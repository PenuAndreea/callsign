import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ErrorReporter } from '../errors/reportError';
import type { RealtimeSocket } from '../realtime/realtime.types';
import type { PendingMessage } from './messages.types';
import { createPendingStore } from './pendingStore';
import { ACK_TIMEOUT_MS, transmit } from './transmit';

const message: PendingMessage = {
  clientMessageId: 'key-1',
  roomId: 'tower',
  content: 'Over.',
  createdAt: '2026-10-17T22:14:00.000Z',
  status: 'sending',
  error: null,
};

/** Only the part of a socket `transmit` uses. */
function socketAnswering(
  answer: () => Promise<unknown>,
  timeouts: number[] = [],
  connected = true,
) {
  return {
    connected,
    timeout: (ms: number) => {
      timeouts.push(ms);
      return { emitWithAck: answer };
    },
  } as unknown as RealtimeSocket;
}

let reportError: ReturnType<typeof vi.fn<ErrorReporter>>;

beforeEach(() => {
  reportError = vi.fn<ErrorReporter>();
});

async function run(socket: RealtimeSocket) {
  const pending = createPendingStore();
  pending.add(message);
  const outcome = await transmit(socket, new QueryClient(), pending, message, reportError);
  return { outcome, ...pending.get('key-1') };
}

const refusal = (statusCode: number, code: string) => () =>
  Promise.resolve({ ok: false, error: { statusCode, code, message: 'x' } });

describe('transmit', () => {
  it('is sent: the pending entry goes away', async () => {
    const socket = socketAnswering(() =>
      Promise.resolve({
        ok: true,
        message: {
          id: 'ff00000000000000000000ff',
          roomId: 'tower',
          sender: { id: 'a0', callsign: 'wolf-2' },
          content: 'Over.',
          createdAt: '2026-10-17T22:14:01.000Z',
        },
      }),
    );
    await expect(run(socket)).resolves.toEqual({ outcome: 'sent' });
  });

  it('fails as NETWORK_ERROR on an ack timeout while still connected, after ACK_TIMEOUT_MS', async () => {
    const timeouts: number[] = [];
    const socket = socketAnswering(
      () => Promise.reject(new Error('operation has timed out')),
      timeouts,
    );
    await expect(run(socket)).resolves.toMatchObject({
      outcome: 'failed',
      status: 'failed',
      error: 'NETWORK_ERROR',
    });
    expect(timeouts).toEqual([ACK_TIMEOUT_MS]);
  });

  it('goes back to the queue when the connection dropped before the ack', async () => {
    const socket = socketAnswering(() => Promise.reject(new Error('timed out')), [], false);
    await expect(run(socket)).resolves.toMatchObject({
      outcome: 'requeued',
      status: 'queued',
      error: null,
    });
  });

  it('goes back to the queue when rate limited', async () => {
    await expect(run(socketAnswering(refusal(429, 'RATE_LIMITED')))).resolves.toMatchObject({
      outcome: 'rateLimited',
      status: 'queued',
    });
  });

  it('fails with the code of any other refusal', async () => {
    await expect(run(socketAnswering(refusal(403, 'NOT_A_MEMBER')))).resolves.toMatchObject({
      outcome: 'failed',
      status: 'failed',
      error: 'NOT_A_MEMBER',
    });
  });

  it('fails as INVALID_RESPONSE on an ack that is not a SendMessageAck', async () => {
    const socket = socketAnswering(() => Promise.resolve({ ok: 'yes' }));
    await expect(run(socket)).resolves.toMatchObject({ error: 'INVALID_RESPONSE' });
    expect(reportError).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'INVALID_RESPONSE' }),
      { source: 'realtime', key: ['message:send'] },
    );
  });

  it('reports a server failure in the ack', async () => {
    const socket = socketAnswering(() =>
      Promise.resolve({
        ok: false,
        error: { statusCode: 500, code: 'INTERNAL_ERROR', message: 'Something went wrong' },
      }),
    );
    await expect(run(socket)).resolves.toMatchObject({ error: 'INTERNAL_ERROR' });
    expect(reportError).toHaveBeenCalledWith(
      expect.objectContaining({ status: 500, code: 'INTERNAL_ERROR' }),
      { source: 'realtime', key: ['message:send'] },
    );
  });

  it('does not report an expected refusal or a timeout', async () => {
    await run(socketAnswering(refusal(403, 'NOT_A_MEMBER')));
    await run(socketAnswering(refusal(429, 'RATE_LIMITED')));
    await run(socketAnswering(() => Promise.reject(new Error('operation has timed out'))));
    expect(reportError).not.toHaveBeenCalled();
  });
});
