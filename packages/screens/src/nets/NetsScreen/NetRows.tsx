import type { RoomDto } from '@callsign/types';
import { Button, RoomListItem, Text } from '@callsign/ui';

import { stationsLabel } from '../../format/stations';

interface JoinedNetRowProps {
  net: RoomDto;
  selected: boolean;
  onOpen: (id: string) => void;
}

/** A joined net: the whole row opens it; the trailing count is spoken as "N stations". */
export function JoinedNetRow({ net, selected, onOpen }: JoinedNetRowProps) {
  return (
    <RoomListItem
      name={net.name}
      joined
      selected={selected}
      preview={net.lastMessage?.content ?? 'No traffic yet.'}
      trailing={<Text variant="meta">{net.memberCount}</Text>}
      trailingLabel={stationsLabel(net.memberCount)}
      onPress={() => onOpen(net.id)}
    />
  );
}

interface OpenNetRowProps {
  net: RoomDto;
  joining: boolean;
  onJoin: (id: string) => void;
}

/** A net to join: the row is not pressable (the Join button is the action, no nested buttons). */
export function OpenNetRow({ net, joining, onJoin }: OpenNetRowProps) {
  return (
    <RoomListItem
      name={net.name}
      joined={false}
      preview={net.lastMessage?.content ?? stationsLabel(net.memberCount)}
      trailing={
        <Button
          label="Join"
          aria-label={`Join ${net.name}`}
          variant="secondary"
          loading={joining}
          onPress={() => onJoin(net.id)}
        />
      }
    />
  );
}
