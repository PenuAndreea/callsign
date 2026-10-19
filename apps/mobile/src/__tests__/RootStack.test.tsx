import { render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import type * as ReactNative from 'react-native';

import { RootStack } from '@/navigation/RootStack';

const mockUseSession = jest.fn();

jest.mock('@callsign/hooks', () => ({ useSession: () => mockUseSession() }));
jest.mock('@callsign/screens', () => {
  const { Text: MockText } = jest.requireActual<typeof ReactNative>('react-native');
  return {
    RestoringScreen: () => <MockText>restoring</MockText>,
    UnreachableScreen: ({ onRetry }: { onRetry: () => void }) => (
      <MockText onPress={onRetry}>unreachable</MockText>
    ),
  };
});
// The splash has its own tests: here it only shows whether it may leave.
jest.mock('@/splash/SplashGate/SplashGate', () => {
  const { Text: MockText } = jest.requireActual<typeof ReactNative>('react-native');
  return {
    SplashGate: ({ ready, children }: { ready: boolean; children: ReactNode }) => (
      <>
        <MockText>{ready ? 'splash may leave' : 'splash stays'}</MockText>
        {children}
      </>
    ),
  };
});
// The stack renders which groups its guards allow.
jest.mock('expo-router', () => {
  const { Text: MockText } = jest.requireActual<typeof ReactNative>('react-native');
  const Stack = ({ children }: { children: ReactNode }) => <>{children}</>;
  Stack.Protected = ({ guard, children }: { guard: boolean; children: ReactNode }) =>
    guard ? <>{children}</> : null;
  Stack.Screen = ({ name }: { name: string }) => <MockText>{`screen ${name}`}</MockText>;
  return { Stack };
});

const session = (status: string) => ({
  session: status === 'signedIn' ? { status, user: { callsign: 'wolf-2' } } : { status },
  retryRestore: jest.fn(),
});

describe('RootStack', () => {
  it('keeps the splash while the session restores', async () => {
    mockUseSession.mockReturnValue(session('restoring'));
    await render(<RootStack />);
    expect(screen.getByText('splash stays')).toBeOnTheScreen();
    expect(screen.getByText('restoring')).toBeOnTheScreen();
  });

  it.each(['unreachable', 'signedOut', 'signedIn'])(
    'lets the splash leave once the session is %s',
    async (status) => {
      mockUseSession.mockReturnValue(session(status));
      await render(<RootStack />);
      expect(screen.getByText('splash may leave')).toBeOnTheScreen();
    },
  );

  it('shows the retry screen when the API could not be reached', async () => {
    mockUseSession.mockReturnValue(session('unreachable'));
    await render(<RootStack />);
    expect(screen.getByText('unreachable')).toBeOnTheScreen();
  });

  it('opens only the auth group while signed out', async () => {
    mockUseSession.mockReturnValue(session('signedOut'));
    await render(<RootStack />);
    expect(screen.getByText('screen (auth)')).toBeOnTheScreen();
    expect(screen.queryByText('screen (app)')).not.toBeOnTheScreen();
  });

  it('opens only the app group while signed in', async () => {
    mockUseSession.mockReturnValue(session('signedIn'));
    await render(<RootStack />);
    expect(screen.getByText('screen (app)')).toBeOnTheScreen();
    expect(screen.queryByText('screen (auth)')).not.toBeOnTheScreen();
  });
});
