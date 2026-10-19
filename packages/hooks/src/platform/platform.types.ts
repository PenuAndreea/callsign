import type { SocketFactory } from '../realtime/realtime.types';

/**
 * Where the mobile app keeps its refresh token (`expo-secure-store` in the app). The hooks
 * never import a storage library themselves: each app passes its own implementation.
 */
export interface RefreshTokenStore {
  read(): Promise<string | null>;
  write(token: string): Promise<void>;
  clear(): Promise<void>;
}

/**
 * Runs `task` while no other tab of the app runs one under the same name (web: the Web Locks
 * API). Without it, two tabs refreshing at once would send the same cookie twice, and the second
 * send would look like a stolen token to the API's reuse detection.
 */
export type ExclusiveRunner = <T>(name: string, task: () => Promise<T>) => Promise<T>;

interface PlatformBase {
  /** Origin of the API, without `/api`. Empty on web: Vite proxies `/api` on the same origin. */
  apiUrl: string;
  runExclusive?: ExclusiveRunner;
  /**
   * How to open the socket. Omitted: `io()` on `apiUrl`. A platform may add options (React
   * Native: `transports: ['websocket']`). `false` turns realtime off (tests that only use HTTP).
   */
  createSocket?: SocketFactory | false;
}

/**
 * What differs between the apps, injected through `ApiProvider`. The client type decides
 * where the refresh token travels, so it comes with its store or without one:
 * - `web`: an httpOnly cookie the browser sends itself; JavaScript never sees the token.
 * - `mobile`: the request body, from the app's secure store.
 */
export type ApiPlatform =
  | (PlatformBase & { client: 'web' })
  | (PlatformBase & { client: 'mobile'; refreshTokenStore: RefreshTokenStore });
