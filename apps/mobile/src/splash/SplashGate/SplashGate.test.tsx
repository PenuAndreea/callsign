import { ThemeProvider } from '@callsign/ui';
import { act, render, screen } from '@testing-library/react-native';
import * as SplashScreen from 'expo-splash-screen';
import { Text } from 'react-native';

import { readIntroSeen } from '../introSeen';
import { MIN_SPLASH_MS } from '../useSplashGate';
import { SplashGate } from './SplashGate';

jest.mock('expo-splash-screen', () => ({ hideAsync: jest.fn(() => Promise.resolve()) }));
jest.mock('../introSeen', () => ({
  readIntroSeen: jest.fn(() => Promise.resolve(true)),
  markIntroSeen: jest.fn(() => Promise.resolve()),
}));

const renderGate = async (ready: boolean) => {
  render(
    <ThemeProvider scheme="dark">
      <SplashGate ready={ready}>
        <Text>the app</Text>
      </SplashGate>
    </ThemeProvider>,
  );
  await act(async () => {
    await Promise.resolve();
  });
};

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('SplashGate', () => {
  it('takes over from the native splash at once', async () => {
    await renderGate(false);
    expect(SplashScreen.hideAsync).toHaveBeenCalledTimes(1);
    expect(readIntroSeen).toHaveBeenCalled();
  });

  it('covers the app, hidden from screen readers, until the gate opens', async () => {
    await renderGate(false);
    expect(screen.getByLabelText('Callsign, connecting')).toBeOnTheScreen();
    expect(screen.queryByText('the app')).toBeNull();
    expect(screen.getByText('the app', { includeHiddenElements: true })).toBeTruthy();
  });

  it('leaves the app on its own once it may go', async () => {
    await renderGate(true);
    act(() => jest.advanceTimersByTime(MIN_SPLASH_MS));

    expect(screen.queryByLabelText('Callsign, connecting')).toBeNull();
    expect(screen.getByText('the app')).toBeOnTheScreen();
  });
});
