import { View } from 'react-native';

import { PressableBase } from '../PressableBase/PressableBase';
import { StatusDot } from '../StatusDot/StatusDot';
import { Text } from '../Text/Text';
import { useRoomListItemStyles } from './RoomListItem.styles';
import type { RoomListItemProps } from './RoomListItem.types';

/** One net in a list: status dot, name, last message, and a trailing count or action. */
export function RoomListItem({
  name,
  joined,
  preview,
  trailing,
  selected = false,
  onPress,
  style,
}: RoomListItemProps) {
  const styles = useRoomListItemStyles();
  const content = (
    <>
      <StatusDot on={joined} />
      <View style={styles.texts}>
        <Text variant="heading">{name}</Text>
        {preview && (
          <Text variant="small" numberOfLines={1}>
            {preview}
          </Text>
        )}
      </View>
      {trailing}
    </>
  );

  if (!onPress) {
    return <View style={[styles.row, selected && styles.selected, style]}>{content}</View>;
  }

  return (
    <PressableBase
      role="button"
      aria-label={[name, joined ? 'joined' : 'not joined', preview].filter(Boolean).join(', ')}
      aria-selected={selected}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        selected && styles.selected,
        pressed && styles.pressed,
        style,
      ]}
    >
      {content}
    </PressableBase>
  );
}
