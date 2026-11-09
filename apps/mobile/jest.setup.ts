// Animation libraries have no native side in Jest: use their own mocks everywhere.
// Reanimated's mock completes every `withTiming` at once and has no `useReducedMotion`; tests
// that need reduced motion set `jest.mocked(useReducedMotion).mockReturnValue(true)`.
jest.mock('react-native-worklets', () =>
  jest.requireActual<object>('react-native-worklets/src/mock'),
);
jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual<object>('react-native-reanimated/mock'),
  useReducedMotion: jest.fn(() => false),
}));
// NetInfo's native module does not exist in Jest; its own mock reports a connected device.
jest.mock('@react-native-community/netinfo', () =>
  jest.requireActual<object>('@react-native-community/netinfo/jest/netinfo-mock.js'),
);
