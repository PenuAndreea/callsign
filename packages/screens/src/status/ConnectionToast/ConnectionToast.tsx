import type { Connectivity } from '@callsign/hooks';
import { useConnectivity } from '@callsign/hooks';
import { StatusToast } from '@callsign/ui';
import { useEffect, useState } from 'react';

import { connectionCopy, TOAST_DELAY_MS } from './connectionCopy';
import { connectionToastStyles as styles } from './ConnectionToast.styles';
import type { ConnectionToastProps } from './ConnectionToast.types';

/**
 * Says when the net is not live: no network ("showing saved traffic") or no socket
 * ("reacquiring"), as a toast floating near the bottom of the screen. Only once that has lasted
 * `TOAST_DELAY_MS`, so connecting at start-up or a blip never flashes it. Nothing while
 * connected.
 */
export function ConnectionToast({ bottom }: ConnectionToastProps) {
  const connectivity = useConnectivity();
  /** The last state that lasted long enough to be shown (none yet: nothing to show). */
  const [settled, setSettled] = useState<Connectivity>('connected');

  useEffect(() => {
    if (connectivity === 'connected') return;
    const timer = setTimeout(() => setSettled(connectivity), TOAST_DELAY_MS);
    return () => clearTimeout(timer);
  }, [connectivity]);

  if (connectivity === 'connected' || settled !== connectivity) return null;
  return <StatusToast message={connectionCopy[connectivity]} style={[styles.toast, { bottom }]} />;
}
