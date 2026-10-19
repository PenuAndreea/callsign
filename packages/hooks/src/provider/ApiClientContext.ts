import { createContext } from 'react';

import type { ApiClient } from '../api/createApiClient';

export const ApiClientContext = createContext<ApiClient | null>(null);
