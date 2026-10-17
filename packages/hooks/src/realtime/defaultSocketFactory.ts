import type { ManagerOptions, SocketOptions } from 'socket.io-client';
import { io } from 'socket.io-client';

import type { RealtimeSocket, SocketFactory } from './realtime.types';

/** Options a platform adds to every socket, e.g. `{ transports: ['websocket'] }` on React Native. */
export type SocketFactoryOptions = Omit<
  Partial<ManagerOptions & SocketOptions>,
  'auth' | 'autoConnect'
>;

/**
 * `io()` on the API's origin, default path `/socket.io` (no `/api` prefix). An empty `apiUrl`
 * (web behind the Vite proxy) means the page's own origin.
 */
export function defaultSocketFactory(
  apiUrl: string,
  extra: SocketFactoryOptions = {},
): SocketFactory {
  return (options) => {
    const merged = { ...extra, ...options };
    const socket: RealtimeSocket = apiUrl === '' ? io(merged) : io(apiUrl, merged);
    return socket;
  };
}
