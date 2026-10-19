import * as SecureStore from 'expo-secure-store';

/** Set once the full intro has played; later launches get the short splash. */
const INTRO_SEEN_KEY = 'callsign.introSeen';

/**
 * Whether this install has played the full intro. A failed read counts as seen: better a short
 * splash than the full intro on every launch while the store is broken.
 */
export async function readIntroSeen(): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(INTRO_SEEN_KEY)) === 'true';
  } catch {
    return true;
  }
}

/** Remembers the intro; a failed write only means it plays once more. */
export async function markIntroSeen(): Promise<void> {
  try {
    await SecureStore.setItemAsync(INTRO_SEEN_KEY, 'true');
  } catch {
    // Nothing to do: the next launch plays the full intro again.
  }
}
