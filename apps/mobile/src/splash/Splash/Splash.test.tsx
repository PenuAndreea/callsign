import { ThemeProvider } from '@callsign/ui';
import { act, render, screen } from '@testing-library/react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { REDUCED_MOTION_HOLD_MS } from '../timeline';
import { Splash } from './Splash';

// Reanimated is mocked in jest.setup.ts: every `withTiming` completes at once.
const renderSplash = (onFinish = jest.fn()) => {
  render(
    <ThemeProvider scheme="dark">
      <Splash onFinish={onFinish} />
    </ThemeProvider>,
  );
  return onFinish;
};

describe('Splash', () => {
  it('is one element for screen readers', () => {
    renderSplash();
    expect(screen.getByLabelText('Callsign, connecting')).toBeOnTheScreen();
  });

  it('shows the emblem, the wordmark and the tuner', () => {
    renderSplash();
    expect(screen.getByTestId('splash-sweep', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getAllByText(/^[CALSIGN]$/)).toHaveLength(8);
    expect(screen.getByText('118.100')).toBeOnTheScreen();
  });

  it('finishes once the intro has played', async () => {
    const onFinish = renderSplash();
    await act(async () => {
      await Promise.resolve();
    });
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

    it('keeps the radar still and finishes after the hold', () => {
      const onFinish = renderSplash();
      expect(screen.queryByTestId('splash-sweep', { includeHiddenElements: true })).toBeNull();

      act(() => jest.advanceTimersByTime(REDUCED_MOTION_HOLD_MS));
      expect(onFinish).toHaveBeenCalledTimes(1);
    });
  });
});
