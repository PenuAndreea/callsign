import { SignInScreen } from '@callsign/screens';
import { useRouter } from 'expo-router';

export default function SignIn() {
  const router = useRouter();
  return <SignInScreen onRegister={() => router.push('/register')} />;
}
