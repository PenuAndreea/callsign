import { lightColors } from '@callsign/theme';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { renderWithTheme } from '../../test/renderWithTheme';
import { Button } from '../Button/Button';
import { Text } from '../Text/Text';
import { RoomListItem } from './RoomListItem';

describe('RoomListItem', () => {
  it('shows the name, last message and trailing slot', () => {
    renderWithTheme(
      <RoomListItem
        name="Tower and ground"
        joined
        preview="Hold at bay four, engines off."
        trailing={<Text variant="meta">12</Text>}
      />,
    );

    expect(screen.getByText('Tower and ground')).toBeInTheDocument();
    expect(screen.getByText('Hold at bay four, engines off.')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('is a button that says its name, status and last message when pressable', async () => {
    const onPress = vi.fn();
    renderWithTheme(
      <RoomListItem name="Flight ops" joined preview="Briefing at 2300." onPress={onPress} />,
    );

    const row = screen.getByRole('button', { name: 'Flight ops, joined, Briefing at 2300.' });
    await userEvent.click(row);

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is not a button without onPress, so a trailing Join button does not nest', () => {
    renderWithTheme(
      <RoomListItem
        name="Crew chiefs"
        joined={false}
        trailing={<Button label="Join" variant="secondary" onPress={vi.fn()} />}
      />,
    );

    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Join' })).toBeInTheDocument();
  });

  it('marks the selected row with a primary border', () => {
    renderWithTheme(<RoomListItem name="Flight ops" joined selected onPress={vi.fn()} />);

    const row = screen.getByRole('button');
    expect(row).toHaveAttribute('aria-selected', 'true');
    expect(row).toHaveStyle({ borderColor: lightColors.primary });
  });

  it('keeps the preview on one line', () => {
    renderWithTheme(<RoomListItem name="Flight ops" joined preview="A long message" />);

    expect(screen.getByText('A long message')).toHaveStyle({ whiteSpace: 'nowrap' });
  });
});
