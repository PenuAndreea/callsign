export interface SignInScreenProps {
  /** "New station? Register here". Signing in itself needs no callback: the session changes. */
  onRegister: () => void;
}
