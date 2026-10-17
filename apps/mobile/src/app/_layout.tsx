import { ApiProvider } from '@callsign/hooks';
import { ThemeProvider } from '@callsign/ui';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

import { connectAppFocus } from '@/appFocus';
import { fontSources } from '@/fonts';
import { RootStack } from '@/navigation/RootStack';
import { createMobilePlatform } from '@/platform';

void SplashScreen.preventAutoHideAsync();
connectAppFocus();

// Module level: the provider reads the platform once.
const platform = createMobilePlatform();

export default function RootLayout() {
  const [loaded, error] = useFonts(fontSources);
  // The splash screen stays until `RootStack` knows the session.
  if (!loaded && error === null) return null;

  return (
    <ThemeProvider>
      <ApiProvider platform={platform}>
        <RootStack />
      </ApiProvider>
    </ThemeProvider>
  );
}
