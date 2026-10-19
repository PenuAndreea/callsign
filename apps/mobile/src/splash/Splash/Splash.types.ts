export interface SplashProps {
  /** Called once when the intro has played (or held its last frame, with reduced motion). */
  onFinish?: () => void;
}
