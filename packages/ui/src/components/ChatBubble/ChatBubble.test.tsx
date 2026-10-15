import { darkColors, lightColors } from '@callsign/theme';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithTheme } from '../../test/renderWithTheme';
import { ChatBubble } from './ChatBubble';

const message = {
  content: 'Runway three-six is clear.',
  senderCallsign: 'twr-ops',
  sentAt: '2026-10-15T21:58:00.000Z',
};

describe('ChatBubble', () => {
  it('shows an incoming message with its sender and Zulu time on the surface', () => {
    renderWithTheme(<ChatBubble {...message} />);

    expect(screen.getByText('twr-ops')).toHaveStyle({ textTransform: 'uppercase' });
    expect(screen.getByText('Runway three-six is clear.')).toHaveStyle({
      color: lightColors.text,
    });
    expect(screen.getByText('21:58Z')).toBeInTheDocument();
    expect(screen.getByText('Runway three-six is clear.').parentElement).toHaveStyle({
      backgroundColor: lightColors.surface,
    });
  });

  it('shows an own message without the sender, on the outgoing colors', () => {
    renderWithTheme(<ChatBubble {...message} own />, { scheme: 'dark' });

    expect(screen.queryByText('twr-ops')).not.toBeInTheDocument();
    const text = screen.getByText('Runway three-six is clear.');
    expect(text).toHaveStyle({ color: darkColors.bubbleOutText });
    expect(text.parentElement).toHaveStyle({ backgroundColor: darkColors.bubbleOut });
    expect(screen.getByText('21:58Z')).toHaveStyle({ color: darkColors.bubbleOutMeta });
  });

  it('accepts a Date as the send time', () => {
    renderWithTheme(<ChatBubble {...message} sentAt={new Date('2026-10-15T08:05:00Z')} />);

    expect(screen.getByText('08:05Z')).toBeInTheDocument();
  });
});
