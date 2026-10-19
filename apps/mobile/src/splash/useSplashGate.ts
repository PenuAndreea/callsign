import { useEffect, useState } from 'react';

import { markIntroSeen, readIntroSeen } from './introSeen';

/** Shortest splash on later launches, so it never just flashes. */
export const MIN_SPLASH_MS = 1500;

export interface SplashGate {
  showSplash: boolean;
  /** For the splash's `onFinish`: the intro has played (or held its last frame). */
  onIntroFinished: () => void;
}

/**
 * When the splash leaves. First launch: once the full intro has played and the app is ready.
 * Later launches: as soon as the app is ready, but not before MIN_SPLASH_MS. Once gone it stays
 * gone, so a later session retry does not bring it back.
 */
export function useSplashGate(ready: boolean): SplashGate {
  const [introSeen, setIntroSeen] = useState<boolean | null>(null);
  const [introDone, setIntroDone] = useState(false);
  const [minElapsed, setMinElapsed] = useState(false);
  const [left, setLeft] = useState(false);

  useEffect(() => {
    let active = true;
    void readIntroSeen().then((seen) => {
      if (active) setIntroSeen(seen);
    });
    const timer = setTimeout(() => setMinElapsed(true), MIN_SPLASH_MS);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, []);

  const canLeave = ready && introSeen !== null && (introSeen ? minElapsed : introDone);
  if (canLeave && !left) setLeft(true);

  return {
    showSplash: !left,
    onIntroFinished: () => {
      if (introDone) return;
      setIntroDone(true);
      // Also while the flag is still being read: the intro has been seen either way.
      if (introSeen !== true) void markIntroSeen();
    },
  };
}
