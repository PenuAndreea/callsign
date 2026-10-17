import type { ApiPlatform, ExclusiveRunner } from '@callsign/hooks';

/**
 * Web Locks: one lock for every tab of this origin. Missing outside secure contexts (plain http
 * on a LAN address); then each tab refreshes on its own, which is only a risk with two tabs open.
 */
function locksRunner(locks: LockManager | undefined): ExclusiveRunner | undefined {
  if (locks === undefined) return undefined;
  return (name, task) => locks.request(name, task);
}

/**
 * Same origin as the API through the Vite proxy (`/api`), so the refresh cookie
 * (`sameSite=strict`, `path=/api/auth`) is sent; JavaScript never sees it.
 */
export function createWebPlatform(locks: LockManager | undefined = navigator.locks): ApiPlatform {
  const runExclusive = locksRunner(locks);
  return { apiUrl: '', client: 'web', ...(runExclusive && { runExclusive }) };
}
