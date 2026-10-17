import { RegisterScreen } from '@callsign/screens';
import { useRouter } from 'expo-router';

import { goBackOr } from '@/navigation/goBackOr';

export default function Register() {
  const router = useRouter();
  const toSignIn = () => goBackOr(router, '/signin');
  return <RegisterScreen onBack={toSignIn} onSignIn={toSignIn} />;
}
