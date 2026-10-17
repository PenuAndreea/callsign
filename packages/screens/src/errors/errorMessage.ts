import type { ClientErrorCode } from '@callsign/hooks';
import { isApiClientError } from '@callsign/hooks';

const GENERIC = 'Something went wrong. Try again.';

/** Copy for every error code a screen can show. Field-specific codes have their own copy too. */
const messages: Record<ClientErrorCode, string> = {
  VALIDATION_FAILED: 'Check the fields and try again.',
  INVALID_CREDENTIALS: 'Callsign or passphrase not recognised.',
  UNAUTHORIZED: 'Your session ended. Report in again.',
  NOT_A_MEMBER: 'Join the net first.',
  NOT_FOUND: 'That net is off the air.',
  CALLSIGN_TAKEN: 'That callsign is already on the net. Pick another.',
  NET_NAME_TAKEN: 'A net with that name already exists.',
  RATE_LIMITED: 'Too many attempts. Stand by and try again in a minute.',
  NETWORK_ERROR: 'No contact with the net. Check your connection.',
  INVALID_RESPONSE: GENERIC,
  INTERNAL_ERROR: GENERIC,
};

/** The copy of one code, e.g. for a pending message that only carries its error code. */
export function errorMessageForCode(code: ClientErrorCode): string {
  return messages[code];
}

/** One line for the user. Unknown errors (bugs) get the generic line; details stay in the log. */
export function errorMessage(error: unknown): string {
  return isApiClientError(error) ? errorMessageForCode(error.code) : GENERIC;
}
