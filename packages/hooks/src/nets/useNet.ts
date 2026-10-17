import { roomDtoSchema } from '@callsign/types';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useApiClient } from '../provider/useApiClient';
import { findNetInLists } from './findNetInLists';
import { netKeys } from './netKeys';
import { netPath } from './netPaths';

/** One net (chat header). Shows the copy from the nets list at once while its own fetch runs. */
export function useNet(id: string) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: netKeys.detail(id),
    queryFn: () => api.request({ method: 'GET', path: netPath(id) }, roomDtoSchema),
    placeholderData: () => findNetInLists(queryClient, id),
  });
}
