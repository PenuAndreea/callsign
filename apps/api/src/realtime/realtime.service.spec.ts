import type { MessageDto } from '@callsign/types';

import type { ChatServer } from './chat-server.types';
import { RealtimeService } from './realtime.service';

const message: MessageDto = {
  id: 'm1',
  roomId: 'r1',
  sender: { id: 'u1', callsign: 'wolf-2' },
  content: 'Radio check. Over.',
  createdAt: '2026-10-17T22:14:00.000Z',
};

/** Records which room each operation targets. */
function fakeServer() {
  const socketsJoin = jest.fn();
  const socketsLeave = jest.fn();
  const emit = jest.fn();
  const in_ = jest.fn(() => ({ socketsJoin, socketsLeave }));
  const to = jest.fn(() => ({ emit }));
  const server = { in: in_, to } as unknown as ChatServer;
  return { server, in: in_, to, socketsJoin, socketsLeave, emit };
}

describe('RealtimeService', () => {
  it('moves every socket of the user into and out of the net', () => {
    const fake = fakeServer();
    const realtime = new RealtimeService();
    realtime.attach(fake.server);

    realtime.joinUserToNet('u1', 'r1');
    realtime.removeUserFromNet('u1', 'r1');

    expect(fake.in).toHaveBeenNthCalledWith(1, 'user:u1');
    expect(fake.socketsJoin).toHaveBeenCalledWith('room:r1');
    expect(fake.in).toHaveBeenNthCalledWith(2, 'user:u1');
    expect(fake.socketsLeave).toHaveBeenCalledWith('room:r1');
  });

  it('broadcasts messages and room updates to the net', () => {
    const fake = fakeServer();
    const realtime = new RealtimeService();
    realtime.attach(fake.server);

    realtime.broadcastMessage(message);
    realtime.broadcastRoomUpdate({ id: 'r1', memberCount: 2 });

    expect(fake.to).toHaveBeenCalledWith('room:r1');
    expect(fake.emit).toHaveBeenNthCalledWith(1, 'message:new', message);
    expect(fake.emit).toHaveBeenNthCalledWith(2, 'room:updated', { id: 'r1', memberCount: 2 });
  });

  it('does nothing before a server is attached', () => {
    const realtime = new RealtimeService();
    expect(() => {
      realtime.joinUserToNet('u1', 'r1');
      realtime.removeUserFromNet('u1', 'r1');
      realtime.broadcastMessage(message);
      realtime.broadcastRoomUpdate({ id: 'r1', memberCount: 1 });
    }).not.toThrow();
  });
});
