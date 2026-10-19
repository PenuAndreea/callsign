import { ApiClientError } from '../api/ApiClientError';

/**
 * Where an error surfaced: a render crash (error boundary), a query, a mutation, or the socket
 * (a send's ack, a live event).
 */
export type ErrorSource = 'render' | 'query' | 'mutation' | 'realtime';

export interface ErrorContext {
  source: ErrorSource;
  /** The query or mutation key, or the socket event name, when there is one. */
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
