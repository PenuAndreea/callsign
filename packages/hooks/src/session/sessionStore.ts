import type { AuthResponse, UserDto } from '@callsign/types';
import type { QueryClient } from '@tanstack/react-query';

import type { ApiClient } from '../api/createApiClient';

/**
 * Who is signed in on this device.
 * - `restoring`: on start, until `/auth/refresh` answers (keep the splash or a blank screen).
 * - `unreachable`: the refresh failed without an answer about the session (offline, 5xx). The
 *   session may still be valid, so this is not `signedOut`: offer a retry (`restore()`).
 */
export type SessionState =
  | { status: 'restoring' }
  | { status: 'unreachable' }
  | { status: 'signedOut' }
  | { status: 'signedIn'; user: UserDto };

export type SessionStatus = SessionState['status'];

export interface SessionStore {
  getSnapshot(): SessionState;
  subscribe(listener: () => void): () => void;
  /** Listens for the client ending the session and restores it. Returns the cleanup. */
  start(): () => void;
  /** Gets a new access token from the refresh token (cookie or secure store). */
  restore(): Promise<void>;
  signIn(auth: AuthResponse): Promise<void>;
  signOut(): Promise<void>;
}

const RESTORING: SessionState = { status: 'restoring' };
const UNREACHABLE: SessionState = { status: 'unreachable' };
const SIGNED_OUT: SessionState = { status: 'signedOut' };

/**
 * The session lives outside React and outside the query cache: React reads it through
 * `useSyncExternalStore`, and every change of user empties the cache and the offline storage,
 * so one station never sees another's nets, on screen or on disk.
 */
/** What the device saved for offline use. Neither method rejects (the caller reports failures). */
export interface OfflineData {
  /** Loads the saved data (the query cache) before the first restore decides anything. */
  load(): Promise<void>;
  /** Empties it, on every change of user. */
  wipe(): Promise<void>;
}

const NO_OFFLINE_DATA: OfflineData = {
  load: () => Promise.resolve(),
  wipe: () => Promise.resolve(),
};

export function createSessionStore(
  api: ApiClient,
  queryClient: QueryClient,
  offline: OfflineData = NO_OFFLINE_DATA,
): SessionStore {
  const listeners = new Set<() => void>();
  let state: SessionState = RESTORING;
  let restoring: Promise<void> | null = null;

  function set(next: SessionState): void {
    state = next;
    for (const listener of listeners) listener();
  }

  function signedOut(): void {
    set(SIGNED_OUT);
    // After the state change, so the signed-in screens are gone and nothing refetches.
    queryClient.clear();
    void offline.wipe();
  }

  async function runRestore(): Promise<void> {
    set(RESTORING);
    // A sign-in that lands first wins: only a restore nobody overtook may set the session.
    const stillRestoring = () => state.status === 'restoring';
    try {
      // The refresh starts at once (a sign-in that lands meanwhile makes its answer stale) and
      // the saved cache loads alongside. Nothing is decided before both: a signed-in screen
      // opens on the saved cache, and a sign-out wipes it with the rest.
      const [auth] = await Promise.all([api.refresh(), offline.load()]);
      if (!stillRestoring()) return;
      if (auth === null) signedOut();
      else set({ status: 'signedIn', user: auth.user });
    } catch {
      if (stillRestoring()) set(UNREACHABLE);
    }
  }

  function restore(): Promise<void> {
    // Only before a session is known; a signed-in device refreshes inside the API client.
    if (state.status !== 'restoring' && state.status !== 'unreachable') return Promise.resolve();
    restoring ??= runRestore().finally(() => {
      restoring = null;
    });
    return restoring;
  }

  return {
    getSnapshot: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    start() {
      // Expired or revoked while signed in (a request's refresh got a 401).
      const stop = api.onSessionEnd(() => {
        if (state.status === 'signedIn') signedOut();
      });
      void restore();
      return stop;
    },
    restore,
    async signIn(auth) {
      await api.startSession(auth);
      queryClient.clear();
      // Nothing saved on this device may belong to another station.
      await offline.wipe();
      set({ status: 'signedIn', user: auth.user });
    },
    async signOut() {
      await api.logout();
      signedOut();
    },
  };
}
