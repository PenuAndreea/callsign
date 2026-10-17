import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderScreen } from '../../test/renderScreen';
import { RestoringScreen } from './RestoringScreen';

describe('RestoringScreen', () => {
  it('renders only a busy background', () => {
    renderScreen(<RestoringScreen />);

    const blank = screen.getByTestId('restoring-screen');
    expect(blank).toHaveAttribute('aria-busy', 'true');
    expect(blank).toBeEmptyDOMElement();
  });
});
