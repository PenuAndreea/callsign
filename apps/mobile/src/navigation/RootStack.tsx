import { useSession } from '@callsign/hooks';
import { RestoringScreen, UnreachableScreen } from '@callsign/screens';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

/**
 * Waits for the session, then guards the two groups: `(auth)` while signed out, `(app)` while
 * signed in. Signing in or out flips the guards and Expo Router moves to the group's first
 * screen by itself; no redirect code. The splash screen stays up until the session is known.
 */
export function RootStack() {
  const { session, retryRestore } = useSession();
  const known = session.status !== 'restoring';

  useEffect(() => {
    if (known) void SplashScreen.hideAsync();
  }, [known]);

  // Behind the splash on start; a blank themed screen during a later retry.
  if (!known) return <RestoringScreen />;
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
