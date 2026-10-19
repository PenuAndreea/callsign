import { act, renderHook } from '@testing-library/react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { REDUCED_MOTION_HOLD_MS } from '@/splash/timeline';
import { useContinuousRotation } from '@/splash/useContinuousRotation';
import { useSplashProgress } from '@/splash/useSplashProgress';

// Reanimated and worklets are mocked in jest.setup.ts: every `withTiming` completes at once.

describe('useSplashProgress', () => {
  it('runs the intro to the end, then finishes', async () => {
    const onFinish = jest.fn();
    const { result } = renderHook(() => useSplashProgress(onFinish));

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.reduceMotion).toBe(false);
    expect(result.current.progress.value).toBe(1);
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  describe('with reduced motion', () => {
    beforeEach(() => {
      jest.mocked(useReducedMotion).mockReturnValue(true);
      jest.useFakeTimers();
    });
    afterEach(() => {
      jest.mocked(useReducedMotion).mockReturnValue(false);
      jest.useRealTimers();
    });

    it('shows the final frame at once and finishes after the hold', () => {
      const onFinish = jest.fn();
      const { result } = renderHook(() => useSplashProgress(onFinish));

      expect(result.current.progress.value).toBe(1);
      act(() => jest.advanceTimersByTime(REDUCED_MOTION_HOLD_MS - 1));
      expect(onFinish).not.toHaveBeenCalled();
      act(() => jest.advanceTimersByTime(1));
      expect(onFinish).toHaveBeenCalledTimes(1);
    });

    it('does not finish once unmounted', () => {
      const onFinish = jest.fn();
      const { unmount } = renderHook(() => useSplashProgress(onFinish));

      unmount();
      act(() => jest.advanceTimersByTime(REDUCED_MOTION_HOLD_MS));
      expect(onFinish).not.toHaveBeenCalled();
    });
  });
});

describe('useContinuousRotation', () => {
  it('turns a full circle while enabled', () => {
    const { result } = renderHook(() => useContinuousRotation(4000, true));
    expect(result.current.value).toBe(360);
  });

  it('stays still while disabled', () => {
    const { result } = renderHook(() => useContinuousRotation(4000, false));
    expect(result.current.value).toBe(0);
  });
});
