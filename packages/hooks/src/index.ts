export type { ClientErrorCode } from './api/ApiClientError';
export { ApiClientError, isApiClientError } from './api/ApiClientError';
export type { ApiClient, ApiClientOptions } from './api/createApiClient';
export { createApiClient } from './api/createApiClient';
export type { ApiRequest, HttpMethod, QueryParams } from './api/http';
export type { ErrorContext, ErrorReporter, ErrorSource } from './errors/reportError';
export { consoleErrorReporter, isUnexpectedError } from './errors/reportError';
export { useReportError } from './errors/useReportError';
export type { ApiPlatform, ExclusiveRunner, RefreshTokenStore } from './platform/platform.types';
export type { ApiProviderProps } from './provider/ApiProvider';
export { ApiProvider } from './provider/ApiProvider';
export { useApiClient } from './provider/useApiClient';
export { createQueryClient } from './query/createQueryClient';
export type { SessionState, SessionStatus } from './session/sessionStore';
export { useLogin, useLogout, useRegister } from './session/useAuthMutations';
export type { UseSessionResult } from './session/useSession';
export { useSession, useSignedInUser } from './session/useSession';
export { netKeys } from './nets/netKeys';
export { useNet } from './nets/useNet';
export { useCreateNet, useJoinNet, useLeaveNet } from './nets/useNetMutations';
export { useNets } from './nets/useNets';
export type {
  RealtimeSocket,
  RealtimeSocketOptions,
  RealtimeStatus,
  SocketFactory,
} from './realtime/realtime.types';
export { useRealtimeStatus } from './realtime/useRealtimeStatus';
export type { ChatEntry, PendingMessage } from './messages/messages.types';
export { useNetMessages } from './messages/useNetMessages';
export type { SendMessageActions } from './messages/useSendMessage';
export { useSendMessage } from './messages/useSendMessage';
export type { SocketFactoryOptions } from './realtime/defaultSocketFactory';
export { defaultSocketFactory } from './realtime/defaultSocketFactory';
// Platform wiring without a second TanStack dependency (React Native: AppState → focus;
// error boundaries reset failed queries on retry).
export { focusManager, onlineManager, useQueryErrorResetBoundary } from '@tanstack/react-query';
