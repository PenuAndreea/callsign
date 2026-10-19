import { StyleSheet } from 'react-native';

/** The splash fades out over the app instead of cutting to it. */
export const SPLASH_FADE_MS = 200;

export const splashGateStyles = StyleSheet.create({
  root: { flex: 1 },
  app: { flex: 1 },
  splash: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
});
