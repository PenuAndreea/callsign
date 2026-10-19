export interface CrashScreenProps {
  /** Renders the crashed part again; failed queries refetch (the boundary's reset). */
  onRetry: () => void;
}
