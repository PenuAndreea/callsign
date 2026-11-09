import type { ErrorReporter } from '../errors/reportError';
import type { OfflineStorage } from '../platform/platform.types';

/**
 * Empties the device's offline storage on a change of user. Never rejects: signing in or out
 * must not fail because of the disk. A failure is a bug (or a full or broken disk), so it is
 * reported; the next sign-in or sign-out tries again.
 */
export async function clearOfflineStorage(
  storage: OfflineStorage | undefined,
  reportError: ErrorReporter,
): Promise<void> {
  if (storage === undefined) return;
  try {
    await storage.clear();
  } catch (error) {
    reportError(error, { source: 'storage', key: ['clear'] });
  }
}
