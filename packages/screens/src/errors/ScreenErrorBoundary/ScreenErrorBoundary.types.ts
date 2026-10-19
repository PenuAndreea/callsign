import type { ReactNode } from 'react';

export interface ScreenErrorBoundaryProps {
  children: ReactNode;
  /**
   * Values that start the screen over when they change, e.g. the open net's id: switching nets
   * leaves a crashed chat without pressing Try again.
   */
  resetKeys?: unknown[];
}
