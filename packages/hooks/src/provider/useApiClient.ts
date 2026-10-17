import { use } from 'react';

import type { ApiClient } from '../api/createApiClient';
import { ApiClientContext } from './ApiClientContext';

/** The app's API client. Throws outside `CallsignProvider`, so a missing provider fails loudly. */
export function useApiClient(): ApiClient {
  const client = use(ApiClientContext);
  if (client === null) throw new Error('useApiClient must be used inside <CallsignProvider>');
  return client;
}
