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
  /** For a render crash: the component stack React recorded. */
  componentStack?: string;
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

/**
 * Reports each error object once. A query bug is seen twice on its way: by the query cache, then
 * by the error boundary it crashes into. Primitives (a thrown string) cannot be tracked and pass.
 */
export function oncePerError(report: ErrorReporter): ErrorReporter {
  const seen = new WeakSet<object>();
  return (error, context) => {
    if (typeof error === 'object' && error !== null) {
      if (seen.has(error)) return;
      seen.add(error);
    }
    report(error, context);
  };
}

/** The default reporter: the console (browser devtools, Metro's terminal). */
export const consoleErrorReporter: ErrorReporter = (error, context) => {
  const where = context.key ?? context.componentStack ?? '';
  console.error(`[callsign] unexpected ${context.source} error`, where, error);
};
