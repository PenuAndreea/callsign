import { RegisterScreen, SignInScreen } from '@callsign/screens';
import { useLocation, useNavigate } from 'react-router';

/** Moving between the two forms keeps the page the user asked for (`state.from`). */
function useAuthNavigation() {
  const navigate = useNavigate();
  const state: unknown = useLocation().state;
  return (path: string) => void navigate(path, { replace: true, state });
}

export function SignInRoute() {
  const go = useAuthNavigation();
  return <SignInScreen onRegister={() => go('/register')} />;
}

export function RegisterRoute() {
  const go = useAuthNavigation();
  return <RegisterScreen onBack={() => go('/signin')} onSignIn={() => go('/signin')} />;
}
