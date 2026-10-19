import { createContext } from 'react';

import type { ErrorReporter } from './reportError';

export const ErrorReporterContext = createContext<ErrorReporter | null>(null);
