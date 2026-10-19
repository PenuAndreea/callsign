import { focusManager } from '@callsign/hooks';
import type { AppStateStatus } from 'react-native';
import { AppState } from 'react-native';

import { connectAppFocus } from '@/appFocus';

describe('connectAppFocus', () => {
  it('tells TanStack Query the app is focused only while it is active', () => {
    let onChange: (state: AppStateStatus) => void = () => undefined;
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
      onChange = listener as (state: AppStateStatus) => void;
      return { remove: jest.fn() };
    });

    connectAppFocus();
    onChange('background');
    expect(focusManager.isFocused()).toBe(false);
    onChange('active');
    expect(focusManager.isFocused()).toBe(true);
  });
});
