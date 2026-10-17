import type { MessageDto, RoomDto, RoomUpdatedEvent } from '@callsign/types';
import { toMessagePreview } from '@callsign/types';
import type { QueryClient } from '@tanstack/react-query';

import { updateNetInCaches } from '../nets/updateNetInCaches';

/** Newer than the net's preview? ISO timestamps from the API compare as strings. */
function isNewer(message: MessageDto, net: RoomDto): boolean {
  return net.lastMessage === null || message.createdAt > net.lastMessage.createdAt;
}

/**
 * `message:new` → the net's preview in the nets list, cut like the API cuts it. An older
 * message (events can arrive out of order) never replaces a newer preview.
 */
export function applyNewMessage(queryClient: QueryClient, message: MessageDto): void {
  updateNetInCaches(queryClient, message.roomId, (net) =>
    isNewer(message, net)
      ? {
          ...net,
          lastMessage: { content: toMessagePreview(message.content), createdAt: message.createdAt },
        }
      : net,
  );
}

/** `room:updated` → the member count in the lists and the chat header. */
export function applyRoomUpdate(
  queryClient: QueryClient,
  { id, memberCount }: RoomUpdatedEvent,
): void {
  updateNetInCaches(queryClient, id, (net) => ({ ...net, memberCount }));
}
