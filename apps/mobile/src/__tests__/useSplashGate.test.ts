import { act, renderHook } from '@testing-library/react-native';

import { markIntroSeen, readIntroSeen } from '@/splash/introSeen';
import { MIN_SPLASH_MS, useSplashGate } from '@/splash/useSplashGate';

jest.mock('@/splash/introSeen', () => ({
  readIntroSeen: jest.fn(),
  markIntroSeen: jest.fn(() => Promise.resolve()),
}));

const launch = async (introSeen: boolean, ready = false) => {
  jest.mocked(readIntroSeen).mockResolvedValue(introSeen);
  const hook = renderHook(({ isReady }: { isReady: boolean }) => useSplashGate(isReady), {
    initialProps: { isReady: ready },
  });
  // Let the stored flag arrive.
  await act(async () => {
    await Promise.resolve();
  });
  return hook;
};

beforeEach(() => jest.useFakeTimers());
afterEach(() => {
  jest.useRealTimers();
  jest.clearAllMocks();
});

describe('useSplashGate on the first launch', () => {
  it('waits for the whole intro, even when the app is ready', async () => {
    const { result } = await launch(false, true);
    act(() => jest.advanceTimersByTime(MIN_SPLASH_MS * 2));
    expect(result.current.showSplash).toBe(true);

    act(() => result.current.onIntroFinished());
    expect(result.current.showSplash).toBe(false);
    expect(markIntroSeen).toHaveBeenCalledTimes(1);
  });

  it('waits for the app after the intro', async () => {
    const { result, rerender } = await launch(false);
    act(() => result.current.onIntroFinished());
    expect(result.current.showSplash).toBe(true);

    rerender({ isReady: true });
    expect(result.current.showSplash).toBe(false);
  });
});

describe('useSplashGate on later launches', () => {
  it('stays the minimum time when the app is ready at once', async () => {
    const { result } = await launch(true, true);
    act(() => jest.advanceTimersByTime(MIN_SPLASH_MS - 1));
    expect(result.current.showSplash).toBe(true);

    act(() => jest.advanceTimersByTime(1));
    expect(result.current.showSplash).toBe(false);
  });

  it('leaves as soon as the app is ready, without waiting for the intro', async () => {
    const { result, rerender } = await launch(true);
    act(() => jest.advanceTimersByTime(MIN_SPLASH_MS * 2));
    expect(result.current.showSplash).toBe(true);

    rerender({ isReady: true });
    expect(result.current.showSplash).toBe(false);
  });

  it('does not store the flag again', async () => {
    const { result } = await launch(true);
    act(() => result.current.onIntroFinished());
    expect(markIntroSeen).not.toHaveBeenCalled();
  });
});

it('does not come back once gone, when the session restores again', async () => {
  const { result, rerender } = await launch(true, true);
  act(() => jest.advanceTimersByTime(MIN_SPLASH_MS));
  expect(result.current.showSplash).toBe(false);

  rerender({ isReady: false });
  expect(result.current.showSplash).toBe(false);
});
