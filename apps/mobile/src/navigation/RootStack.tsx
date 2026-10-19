import type { UseSessionResult } from '@callsign/hooks';
import { useSession } from '@callsign/hooks';
import { RestoringScreen, UnreachableScreen } from '@callsign/screens';
import { Stack } from 'expo-router';

import { SplashGate } from '@/splash/SplashGate/SplashGate';

/**
 * The animated splash over the app until the session is known (restored, or the API is
 * unreachable). See `Routes` for where the app goes then.
 */
export function RootStack() {
  const state = useSession();
  return (
    <SplashGate ready={state.session.status !== 'restoring'}>
      <Routes {...state} />
    </SplashGate>
  );
}

/**
 * Waits for the session, then guards the two groups: `(auth)` while signed out, `(app)` while
 * signed in. Signing in or out flips the guards and Expo Router moves to the group's first
 * screen by itself; no redirect code.
 */
function Routes({ session, retryRestore }: UseSessionResult) {
  // Under the splash on start; a blank themed screen during a later retry.
  if (session.status === 'restoring') return <RestoringScreen />;
  if (session.status === 'unreachable') {
    return <UnreachableScreen onRetry={() => void retryRestore()} />;
  }

  const signedIn = session.status === 'signedIn';
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}
