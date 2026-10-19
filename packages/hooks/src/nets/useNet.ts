import { roomDtoSchema } from '@callsign/types';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useApiClient } from '../provider/useApiClient';
import { findNetInLists } from './findNetInLists';
import { netKeys } from './netKeys';
import { netPath } from './netPaths';

/**
 * One net (chat header). Starts from the copy in a loaded nets list, as data as old as that
 * list: it shows at once, its own fetch runs once it is stale, and a failed fetch keeps it (a
 * placeholder would be dropped, and the header would lose the net's name).
 */
export function useNet(id: string) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: netKeys.detail(id),
    queryFn: () => api.request({ method: 'GET', path: netPath(id) }, roomDtoSchema),
    initialData: () => findNetInLists(queryClient, id)?.net,
    initialDataUpdatedAt: () => findNetInLists(queryClient, id)?.updatedAt,
  });
}
