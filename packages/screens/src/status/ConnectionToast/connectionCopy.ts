import type { Connectivity } from '@callsign/hooks';

/** How long the net may be down before the toast shows: a normal start-up never flashes it. */
export const TOAST_DELAY_MS = 1500;

/** Under an action that needs the API (create a net) while the device is offline. */
export const OFFLINE_ACTION_NOTE = 'No signal. This works again once you are back on the air.';

/** What the toast says while the net is not live. */
export const connectionCopy: Record<Exclude<Connectivity, 'connected'>, string> = {
  offline: 'No signal. Showing saved traffic.',
  noSignal: 'Reacquiring signal',
};
