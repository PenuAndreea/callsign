import type { ClientType } from '@callsign/types';
import type { z } from 'zod';

import { ApiClientError } from './ApiClientError';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export type QueryParams = Readonly<Record<string, string | number | undefined>>;

/** One call, described without transport details. `path` has no `/api` prefix: `/rooms`. */
export interface ApiRequest {
  method: HttpMethod;
  path: string;
  query?: QueryParams;
  body?: unknown;
  /** Send the access token and refresh once on a 401. Default `true`; `false` for `/auth/*`. */
  auth?: boolean;
}

export interface HttpConfig {
  apiUrl: string;
  client: ClientType;
  fetch: typeof fetch;
}

export function buildUrl(apiUrl: string, path: string, query: QueryParams = {}): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, String(value));
  }
  const search = params.toString();
  return `${apiUrl}/api${path}${search === '' ? '' : `?${search}`}`;
}

export interface HttpResponse {
  status: number;
  /** Parsed JSON, or `undefined` for an empty body (204). */
  body: unknown;
}

/**
 * Sends one request. Never retries and never refreshes: that is `createApiClient`'s job.
 * Rejects with `ApiClientError` only (non-2xx responses included).
 */
export async function sendHttp(
  config: HttpConfig,
  request: ApiRequest,
  accessToken: string | null,
): Promise<HttpResponse> {
  const headers: Record<string, string> = { 'X-Client': config.client };
  if (request.body !== undefined) headers['Content-Type'] = 'application/json';
  if (accessToken !== null) headers.Authorization = `Bearer ${accessToken}`;

  let response: Response;
  try {
    response = await config.fetch(buildUrl(config.apiUrl, request.path, request.query), {
      method: request.method,
      headers,
      // Web: the refresh cookie goes to the same origin only (the Vite proxy in dev).
      credentials: 'same-origin',
      ...(request.body !== undefined && { body: JSON.stringify(request.body) }),
    });
  } catch (cause) {
    throw new ApiClientError(0, 'NETWORK_ERROR', 'Could not reach the API', { cause });
  }

  const body = await readJson(response);
  if (!response.ok) throw ApiClientError.fromResponse(response.status, body);
  return { status: response.status, body };
}

/** Parses a response with the shared schema; a mismatch means the client and API disagree. */
export function parseResponse<T>(schema: z.ZodType<T>, { status, body }: HttpResponse): T {
  const parsed = schema.safeParse(body);
  if (parsed.success) return parsed.data;
  throw new ApiClientError(status, 'INVALID_RESPONSE', 'The API sent an unexpected response', {
    cause: parsed.error,
  });
}

async function readJson(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;
  const text = await response.text();
  if (text === '') return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}
