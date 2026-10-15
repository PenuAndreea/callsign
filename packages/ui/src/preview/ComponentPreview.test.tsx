import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { renderWithTheme } from '../test/renderWithTheme';
import { ComponentPreview } from './ComponentPreview';

describe('ComponentPreview', () => {
  it('renders every component in both schemes', () => {
    for (const scheme of ['light', 'dark'] as const) {
      const { unmount } = renderWithTheme(<ComponentPreview />, { scheme });

      expect(screen.getByRole('heading', { name: 'Callsign' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Open to join' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: 'Message' })).toBeInTheDocument();
      unmount();
    }
  });

  it('adds a sent message to the conversation', async () => {
    renderWithTheme(<ComponentPreview />);

    await userEvent.type(screen.getByRole('textbox', { name: 'Message' }), 'Copy, holding.');
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(screen.getByText('Copy, holding.')).toBeInTheDocument();
  });
});
