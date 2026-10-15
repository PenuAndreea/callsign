import { ThemeProvider } from '@callsign/ui';
import { ComponentPreview } from '@callsign/ui/preview';

// Temporary M1 component check through react-native-web; replaced by the real screens in M5.
function App() {
  return (
    <ThemeProvider>
      <ComponentPreview />
    </ThemeProvider>
  );
}

export default App;
