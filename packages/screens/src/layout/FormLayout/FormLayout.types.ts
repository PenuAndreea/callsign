import type { ReactNode } from 'react';

export interface FormLayoutProps {
  /** Row above the masthead, e.g. the back button on register. */
  header?: ReactNode;
  /** Tracked line at the bottom, e.g. "Keep the net clear. Be brief. Be kind. Over." */
  footer?: string;
  children: ReactNode;
}
