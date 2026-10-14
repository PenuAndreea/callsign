import { render, screen } from '@testing-library/react-native';

import Index from '@/app/index';

describe('Index screen', () => {
  it('renders the placeholder text', async () => {
    await render(<Index />);

    expect(screen.getByText(/edit src\/app\/index\.tsx/i)).toBeOnTheScreen();
  });
});
