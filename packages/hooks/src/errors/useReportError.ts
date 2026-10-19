import { use } from 'react';

import { ErrorReporterContext } from './ErrorReporterContext';
import type { ErrorReporter } from './reportError';

/** The app's error reporter (error boundaries use it). Throws outside `ApiProvider`. */
export function useReportError(): ErrorReporter {
  const report = use(ErrorReporterContext);
  if (report === null) throw new Error('useReportError must be used inside <ApiProvider>');
  return report;
}
