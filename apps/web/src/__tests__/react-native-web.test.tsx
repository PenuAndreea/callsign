import { render, screen } from '@testing-library/react';
import { Pressable, Text, View } from 'react-native';
import { describe, expect, it } from 'vitest';

// Guards the `react-native` → `react-native-web` alias the shared UI library relies on.
describe('react-native-web alias', () => {
  it('renders React Native primitives as DOM elements', () => {
    render(
      <View testID="container">
        <Pressable role="button" aria-label="Report in">
          <Text>Report in</Text>
        </Pressable>
      </View>,
    );

    expect(screen.getByTestId('container')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Report in' })).toBeInTheDocument();
  });
});
