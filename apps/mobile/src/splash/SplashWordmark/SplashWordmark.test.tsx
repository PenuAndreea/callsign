import { ThemeProvider } from '@callsign/ui';
import { render, screen } from '@testing-library/react-native';
import { useSharedValue } from 'react-native-reanimated';

import { SplashWordmark, WORDMARK } from './SplashWordmark';

function Wordmark() {
  return <SplashWordmark progress={useSharedValue(1)} />;
}

describe('SplashWordmark', () => {
  it('spells the wordmark one letter at a time, then the tagline', () => {
    render(
      <ThemeProvider scheme="light">
        <Wordmark />
      </ThemeProvider>,
    );
    expect(screen.getAllByText(/^[A-Z]$/).map((letter) => letter.props.children)).toEqual([
      ...WORDMARK,
    ]);
    expect(screen.getByText('Field radio · flight and ground')).toBeOnTheScreen();
  });
});
