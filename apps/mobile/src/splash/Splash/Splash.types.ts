export interface SplashProps {
  /** Called once when the intro has played (or held its last frame, with reduced motion). */
  onFinish?: () => void;
  /**
   * The intro starts when this turns true (default: at once). Lets the caller wait until the
   * splash is really on screen, so nothing covering it eats the start.
   */
  started?: boolean;
}
