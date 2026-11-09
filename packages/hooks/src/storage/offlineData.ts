import type { UserDto } from '@callsign/types';
import { userDtoSchema } from '@callsign/types';

import type { ErrorReporter } from '../errors/reportError';
import type { OfflineStorage } from '../platform/platform.types';
import type { OfflineData } from '../session/sessionStore';
import type { CachePersistence } from './cachePersistence';
import { clearOfflineStorage } from './clearOfflineStorage';

/** The storage key of the station last signed in on this device. */
export const USER_KEY = 'session-user';

interface OfflineDataOptions {
  /** Omitted: nothing is saved, and a start without network shows the unreachable screen. */
  storage: OfflineStorage | undefined;
  persistence: CachePersistence;
  reportError: ErrorReporter;
}

/**
 * What the session store needs from the device: the saved query cache and who it belongs to.
 * The saved user is parsed with the shared schema like an API response (it comes from disk); one
 * that does not match reads as none. Nothing here rejects: failures are reported
 * (`source: 'storage'`) and the app goes on as if nothing was saved.
 */
export function createOfflineData({
  storage,
  persistence,
  reportError,
}: OfflineDataOptions): OfflineData {
  const report = (error: unknown) => reportError(error, { source: 'storage', key: ['user'] });

  async function readUser(): Promise<UserDto | null> {
    if (storage === undefined) return null;
    try {
      const raw = await storage.getItem(USER_KEY);
      if (raw === null) return null;
      const user = userDtoSchema.safeParse(JSON.parse(raw));
      return user.success ? user.data : null;
    } catch (error) {
      report(error);
      return null;
    }
  }

  return {
    async load() {
      const [, user] = await Promise.all([persistence.restore(), readUser()]);
      return user;
    },
    async saveUser(user) {
      try {
        await storage?.setItem(USER_KEY, JSON.stringify(user));
      } catch (error) {
        report(error);
      }
    },
    wipe: () => clearOfflineStorage(storage, reportError),
  };
}
