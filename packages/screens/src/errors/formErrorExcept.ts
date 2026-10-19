import type { ClientErrorCode } from '@callsign/hooks';
import { isApiClientError } from '@callsign/hooks';

import { errorMessageIfAny } from './errorMessage';

/**
 * The form-level message for `error`, unless it is `fieldCode`: that one is shown under its
 * field instead (e.g. `CALLSIGN_TAKEN` under the callsign), so it never appears twice.
 */
export function formErrorExcept(error: unknown, fieldCode: ClientErrorCode): string | undefined {
  return isApiClientError(error, fieldCode) ? undefined : errorMessageIfAny(error);
}
