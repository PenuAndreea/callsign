import { Stack } from 'expo-router';

// Sign in first: without this, the alphabetical order would open on register.
export const unstable_settings = { initialRouteName: 'signin' };

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
