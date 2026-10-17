import type { LoginRequest, RegisterRequest, UserDto } from '@callsign/types';
import { authResponseSchema } from '@callsign/types';
import type { UseMutationResult } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';

import type { ApiRequest } from '../api/http';
import { useApiClient } from '../provider/useApiClient';
import { useSessionStore } from './SessionContext';

/** Login and register answer the same way: an `AuthResponse` that starts the session. */
function useSignInMutation<TValues>(
  path: '/auth/login' | '/auth/register',
): UseMutationResult<UserDto, Error, TValues> {
  const api = useApiClient();
  const session = useSessionStore();
  return useMutation({
    mutationFn: async (values: TValues) => {
      const request: ApiRequest = { method: 'POST', path, body: values, auth: false };
      const auth = await api.request(request, authResponseSchema);
      await session.signIn(auth);
      return auth.user;
    },
  });
}

/** Errors: `INVALID_CREDENTIALS` (401), `VALIDATION_FAILED`, `RATE_LIMITED`, `NETWORK_ERROR`. */
export function useLogin(): UseMutationResult<UserDto, Error, LoginRequest> {
  return useSignInMutation<LoginRequest>('/auth/login');
}

/** Registering signs in. Errors: `CALLSIGN_TAKEN` (409), `VALIDATION_FAILED`, `RATE_LIMITED`. */
export function useRegister(): UseMutationResult<UserDto, Error, RegisterRequest> {
  return useSignInMutation<RegisterRequest>('/auth/register');
}

/** Never fails: the device is signed out even when the API cannot be reached. */
export function useLogout(): UseMutationResult<void, Error, void> {
  const session = useSessionStore();
  return useMutation({ mutationFn: () => session.signOut() });
}
