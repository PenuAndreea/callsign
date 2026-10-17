import { focusManager } from '@callsign/hooks';
import type { AppStateStatus } from 'react-native';
import { AppState } from 'react-native';

/**
 * TanStack Query refetches stale data on focus; on the web that is the tab's visibility, on a
 * phone it is the app coming to the foreground. This catches up on what changed elsewhere
 * (e.g. leaving a net on another device, which sends this one no event).
 */
export function connectAppFocus(): void {
  focusManager.setEventListener((setFocused) => {
    const subscription = AppState.addEventListener('change', (state: AppStateStatus) =>
      setFocused(state === 'active'),
    );
    return () => subscription.remove();
  });
}
