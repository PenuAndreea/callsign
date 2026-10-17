import { io } from 'socket.io-client';

import type { RealtimeSocket, SocketFactory } from './realtime.types';

/**
 * `io()` on the API's origin, default path `/socket.io` (no `/api` prefix). An empty `apiUrl`
 * (web behind the Vite proxy) means the page's own origin.
 */
export function defaultSocketFactory(apiUrl: string): SocketFactory {
  return (options) => {
    const socket: RealtimeSocket = apiUrl === '' ? io(options) : io(apiUrl, options);
    return socket;
  };
}
