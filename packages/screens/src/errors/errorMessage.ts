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

/**
 * Codes whose copy differs for a message send. The socket limits sends per 5 seconds, not per
 * minute like the HTTP routes.
 */
const sendMessages: Partial<Record<ClientErrorCode, string>> = {
  RATE_LIMITED: 'Transmitting too fast. Stand by a few seconds, then retry.',
};

/** The copy under a message that was not sent. */
export function sendErrorMessage(code: ClientErrorCode): string {
  return sendMessages[code] ?? errorMessageForCode(code);
}

/** One line for the user. Unknown errors (bugs) get the generic line; details stay in the log. */
export function errorMessage(error: unknown): string {
  return isApiClientError(error) ? errorMessageForCode(error.code) : GENERIC;
}

/** The copy for a failed query or mutation, or nothing while there is no error. */
export function errorMessageIfAny(error: unknown): string | undefined {
  return error === null || error === undefined ? undefined : errorMessage(error);
}
