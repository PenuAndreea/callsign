import { darkColors, lightColors } from '@callsign/theme';
import { ThemeProvider } from '@callsign/ui';
import { render, screen } from '@testing-library/react-native';
import { useSharedValue } from 'react-native-reanimated';

import { DIAL_LINES } from '../timeline';
import { SplashTuner } from './SplashTuner';

function Tuner() {
  return <SplashTuner progress={useSharedValue(1)} />;
}

describe('SplashTuner', () => {
  it.each([
    ['dark', darkColors],
    ['light', lightColors],
  ] as const)('shows the dial on the %s display panel', (scheme, colors) => {
    render(
      <ThemeProvider scheme={scheme}>
        <Tuner />
      </ThemeProvider>,
    );
    DIAL_LINES.forEach((line) => {
      expect(screen.getByText(line)).toHaveStyle({ color: colors.displayText });
    });
    expect(screen.getByText('Tuning')).toHaveStyle({ color: colors.displayMuted });
  });

  it('has both status lines, which swap in place', () => {
    render(
      <ThemeProvider scheme="dark">
        <Tuner />
      </ThemeProvider>,
    );
    expect(screen.getByText('Acquiring signal')).toBeOnTheScreen();
    expect(screen.getByText('Carrier locked')).toHaveStyle({ color: darkColors.text });
  });
});
