export interface UnreachableScreenProps {
  /** Tries to restore the session again (`useSession().retryRestore`). */
  onRetry: () => void;
}
