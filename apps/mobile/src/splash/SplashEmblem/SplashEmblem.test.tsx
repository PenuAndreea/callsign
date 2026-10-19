import { ThemeProvider } from '@callsign/ui';
import { render, screen } from '@testing-library/react-native';
import { useSharedValue } from 'react-native-reanimated';

import { SplashEmblem } from './SplashEmblem';

function Emblem({ reduceMotion }: { reduceMotion: boolean }) {
  return <SplashEmblem progress={useSharedValue(1)} reduceMotion={reduceMotion} />;
}

const renderEmblem = (reduceMotion: boolean) =>
  render(
    <ThemeProvider scheme="dark">
      <Emblem reduceMotion={reduceMotion} />
    </ThemeProvider>,
  );

describe('SplashEmblem', () => {
  it('spins the radar sweep and the dashed ring', () => {
    renderEmblem(false);
    expect(screen.getByTestId('splash-sweep', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByTestId('splash-dashed-ring', { includeHiddenElements: true })).toBeTruthy();
  });

  it('leaves out everything that spins with reduced motion', () => {
    renderEmblem(true);
    expect(screen.queryByTestId('splash-sweep', { includeHiddenElements: true })).toBeNull();
    expect(screen.queryByTestId('splash-dashed-ring', { includeHiddenElements: true })).toBeNull();
  });

  it('is hidden from screen readers', () => {
    renderEmblem(false);
    expect(screen.queryByTestId('splash-sweep')).toBeNull();
  });
});
