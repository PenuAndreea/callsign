import type { ApiPlatform } from '../platform/platform.types';
import { defaultSocketFactory } from './defaultSocketFactory';
import type { SocketFactory } from './realtime.types';

/** The platform's factory, the default `io()` on its API origin, or `null` when turned off. */
export function resolveSocketFactory(platform: ApiPlatform): SocketFactory | null {
  if (platform.createSocket === false) return null;
  return platform.createSocket ?? defaultSocketFactory(platform.apiUrl);
}
