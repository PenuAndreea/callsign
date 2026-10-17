import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';

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
function socketAnswering(answer: () => Promise<unknown>, timeouts: number[] = []) {
  return {
    timeout: (ms: number) => {
      timeouts.push(ms);
      return { emitWithAck: answer };
    },
  } as unknown as RealtimeSocket;
}

async function run(socket: RealtimeSocket | null) {
  const pending = createPendingStore();
  pending.add(message);
  await transmit(socket, new QueryClient(), pending, message);
  return pending.get('key-1');
}

describe('transmit', () => {
  it('fails as NETWORK_ERROR on an ack timeout, waiting ACK_TIMEOUT_MS', async () => {
    const timeouts: number[] = [];
    const socket = socketAnswering(
      () => Promise.reject(new Error('operation has timed out')),
      timeouts,
    );
    await expect(run(socket)).resolves.toMatchObject({ status: 'failed', error: 'NETWORK_ERROR' });
    expect(timeouts).toEqual([ACK_TIMEOUT_MS]);
  });

  it('fails as NETWORK_ERROR without a socket', async () => {
    await expect(run(null)).resolves.toMatchObject({ status: 'failed', error: 'NETWORK_ERROR' });
  });

  it('fails as INVALID_RESPONSE on an ack that is not a SendMessageAck', async () => {
    const socket = socketAnswering(() => Promise.resolve({ ok: 'yes' }));
    await expect(run(socket)).resolves.toMatchObject({ error: 'INVALID_RESPONSE' });
  });
});
