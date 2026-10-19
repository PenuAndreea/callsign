import { darkColors } from '@callsign/theme';
import { ThemeProvider } from '@callsign/ui';
import { render, screen } from '@testing-library/react-native';
import { useSharedValue } from 'react-native-reanimated';

import { PingRing } from './PingRing';

function Ring() {
  return <PingRing progress={useSharedValue(0)} beat={[0.2, 0.4]} />;
}

describe('PingRing', () => {
  it('is a primary-coloured ring that never takes touches', () => {
    render(
      <ThemeProvider scheme="dark">
        <Ring />
      </ThemeProvider>,
    );
    const ring = screen.UNSAFE_root.findAll(
      (node) => typeof node.type === 'string' && node.props.pointerEvents === 'none',
    )[0];
    expect(ring).toHaveStyle({ borderColor: darkColors.primary });
  });
});
