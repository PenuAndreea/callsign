import type { CreateRoomRequest, RoomDto } from '@callsign/types';
import { roomDtoSchema } from '@callsign/types';
import type { QueryClient, UseMutationResult } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useApiClient } from '../provider/useApiClient';
import { netKeys } from './netKeys';
import { membershipPath } from './netPaths';

/**
 * After a membership change the net moves between sections: refetch both lists (sorted by
 * name on the server, so placing it locally would mean re-sorting pages), and keep the
 * returned net as its detail so the chat header has it at once.
 */
function settleMembership(queryClient: QueryClient, net: RoomDto): Promise<void> {
  queryClient.setQueryData(netKeys.detail(net.id), net);
  return queryClient.invalidateQueries({ queryKey: netKeys.lists() });
}

/** Errors: `NET_NAME_TAKEN` (409), `VALIDATION_FAILED`. The creator is joined automatically. */
export function useCreateNet(): UseMutationResult<RoomDto, Error, CreateRoomRequest> {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: CreateRoomRequest) =>
      api.request({ method: 'POST', path: '/rooms', body: request }, roomDtoSchema),
    onSuccess: (net) => settleMembership(queryClient, net),
  });
}

/** Idempotent: joining a net twice is not an error. Errors: `NOT_FOUND`. */
export function useJoinNet(): UseMutationResult<RoomDto, Error, string> {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.request({ method: 'PUT', path: membershipPath(id) }, roomDtoSchema),
    onSuccess: (net) => settleMembership(queryClient, net),
  });
}

/**
 * Idempotent. The cached detail is marked as left (count down by one) instead of refetched: the
 * leaver gets no `room:updated`, and a header still on screen stays right. Errors: `NOT_FOUND`.
 */
export function useLeaveNet(): UseMutationResult<void, Error, string> {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.requestNoContent({ method: 'DELETE', path: membershipPath(id) }),
    onSuccess: (_, id) => {
      queryClient.setQueryData<RoomDto>(netKeys.detail(id), (net) =>
        net?.isMember
          ? { ...net, isMember: false, memberCount: Math.max(0, net.memberCount - 1) }
          : net,
      );
      return queryClient.invalidateQueries({ queryKey: netKeys.lists() });
    },
  });
}
