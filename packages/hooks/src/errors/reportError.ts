import { ApiClientError } from '../api/ApiClientError';

/** Where an error surfaced: a render crash (error boundary), a query or a mutation. */
export type ErrorSource = 'render' | 'query' | 'mutation';

export interface ErrorContext {
  source: ErrorSource;
  /** The query or mutation key, when there is one. */
  key?: readonly unknown[];
}

/**
 * Sends an unexpected error somewhere a developer will see it. Injected per app through
 * `ApiPlatform.reportError`, so a service (Sentry, ...) plugs in without touching hooks or screens.
 */
export type ErrorReporter = (error: unknown, context: ErrorContext) => void;

/**
 * Worth a report: a bug (anything that is not an `ApiClientError`), a response that breaks the
 * contract, or a server failure. A 4xx or a lost connection is normal life, shown to the user
 * and not reported.
 */
export function isUnexpectedError(error: unknown): boolean {
  if (!(error instanceof ApiClientError)) return true;
  return error.code === 'INVALID_RESPONSE' || error.code === 'INTERNAL_ERROR';
}

/** The default reporter: the console (browser devtools, Metro's terminal). */
export const consoleErrorReporter: ErrorReporter = (error, context) => {
  console.error(`[callsign] unexpected ${context.source} error`, context.key ?? '', error);
};
