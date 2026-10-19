import type { SharedValue } from 'react-native-reanimated';

export interface SplashWordmarkProps {
  progress: SharedValue<number>;
}

export interface SplashLetterProps {
  character: string;
  /** Where this letter's rise starts in the intro's progress. */
  start: number;
  progress: SharedValue<number>;
}
