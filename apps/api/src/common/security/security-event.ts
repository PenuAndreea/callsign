import type { ClientType } from '@callsign/types';

/**
 * Every security event the API records. A closed union, so an entry can only carry these fields:
 * never a passphrase, token or hash. One entry per event, read by log tooling (alerts on
 * `event`), so names and fields are a contract: add new ones rather than renaming.
 */
export type SecurityEvent =
  | {
      event: 'login_failed';
      callsign: string;
      /** Server-side only: the API answers the same for both, so callsigns cannot be enumerated. */
      reason: 'unknown_callsign' | 'wrong_passphrase';
      ip: string;
      client: ClientType;
    }
  | { event: 'login_succeeded'; userId: string; callsign: string; ip: string; client: ClientType }
  | { event: 'rate_limited'; method: string; route: string; ip: string }
  | { event: 'refresh_token_reuse'; sessionId: string; userId: string };

/** Where an auth request came from, read by the controller (services never see `req`). */
export interface RequestOrigin {
  ip: string;
  client: ClientType;
}
