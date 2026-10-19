export interface CrashScreenProps {
  /** Renders the crashed part again; failed queries refetch (the boundary's reset). */
  onRetry: () => void;
  /**
   * Leaves the crashed screen. Pass it where the screen's own header (with its back button) is
   * gone with the crash, e.g. a chat on a phone.
   */
  onBack?: () => void;
}
