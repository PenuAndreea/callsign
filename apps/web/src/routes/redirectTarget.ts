/** Where `RequireAuth` keeps the page the user asked for, so sign-in can return there. */
export interface FromState {
  from: string;
}

export function fromState(pathname: string): FromState {
  return { from: pathname };
}

/**
 * The page to open after signing in. Router state is `unknown` (it survives reloads in
 * history), so it is checked; only same-app paths are accepted, never a full URL.
 */
export function redirectTarget(state: unknown): string {
  if (typeof state !== 'object' || state === null || !('from' in state)) return '/';
  const { from } = state;
  return typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') ? from : '/';
}
