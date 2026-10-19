import { useQueryErrorResetBoundary, useReportError } from '@callsign/hooks';
import { ErrorBoundary } from 'react-error-boundary';

import { CrashScreen } from '../../status/CrashScreen/CrashScreen';
import type { ScreenErrorBoundaryProps } from './ScreenErrorBoundary.types';

/**
 * Catches a render crash below it (a bug, or a query bug thrown by `throwOnError`), reports it
 * and shows `CrashScreen` in its place. Try again resets the failed queries first, so they
 * refetch instead of throwing their cached error again. Place it inside `ApiProvider`.
 */
export function ScreenErrorBoundary({ children, resetKeys, onBack }: ScreenErrorBoundaryProps) {
  const reportError = useReportError();
  const { reset } = useQueryErrorResetBoundary();

  return (
    <ErrorBoundary
      onReset={reset}
      onError={(error, info) =>
        reportError(error, {
          source: 'render',
          ...(info.componentStack && { componentStack: info.componentStack }),
        })
      }
      fallbackRender={({ resetErrorBoundary }) => (
        <CrashScreen onRetry={resetErrorBoundary} {...(onBack && { onBack })} />
      )}
      {...(resetKeys && { resetKeys })}
    >
      {children}
    </ErrorBoundary>
  );
}
