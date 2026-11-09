import type { Connectivity } from '@callsign/hooks';

/** How long the net may be down before the toast shows: a normal start-up never flashes it. */
export const TOAST_DELAY_MS = 1500;

/** What the toast says while the net is not live. */
export const connectionCopy: Record<Exclude<Connectivity, 'connected'>, string> = {
  offline: 'No signal. Showing saved traffic.',
  noSignal: 'Reacquiring signal',
};
