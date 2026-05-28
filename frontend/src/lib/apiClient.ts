import { getStorage } from './storage';
import type { ApiError } from './types';
import { captureFrontendException } from './errorTracking';

export const TOKEN_KEY = 'horoscope_token';

function readExpoPublicApiBaseUrl(): string {
  const g = globalThis as unknown as {
    process?: { env?: Record<string, string | undefined> };
  };
  const raw = g.process?.env?.EXPO_PUBLIC_API_BASE_URL;
  return typeof raw === 'string' && raw.trim().length > 0 ? raw.trim() : '';
}

function resolveDefaultBaseUrl(): string {
  const expo = readExpoPublicApiBaseUrl();
  if (expo) return expo.replace(/\/$/, '');
  const env = typeof import.meta !== 'undefined' ? import.meta.env : undefined;
  const vite = (env?.VITE_API_BASE_URL ?? env?.VITE_API_URL)?.trim();
  if (vite && vite.length > 0) return vite.replace(/\/$/, '');
  return 'http://127.0.0.1:8787';
}

let baseUrl: string = resolveDefaultBaseUrl();

let activeLocale: string = 'mn';

export function configureApi(options: { baseUrl?: string }): void {
  if (options.baseUrl !== undefined) {
    baseUrl = options.baseUrl.replace(/\/$/, '');
  }
}

export function getApiBaseUrl(): string {
  return baseUrl;
}

export function setApiLocale(locale: string): void {
  activeLocale = locale;
}

export function getApiLocale(): string {
  return activeLocale;
}

export async function getAuthToken(): Promise<string | null> {
  return getStorage().getItem(TOKEN_KEY);
}

export async function setAuthToken(token: string | null): Promise<void> {
  if (token === null) {
    await getStorage().removeItem(TOKEN_KEY);
  } else {
    await getStorage().setItem(TOKEN_KEY, token);
  }
}

export class ApiClientError extends Error implements ApiError {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiClientError';
  }
}

/** Default ceiling so hung requests (API down / wrong host) do not block the UI indefinitely. */
const DEFAULT_REQUEST_TIMEOUT_MS = 15_000;

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean;
  headers?: Record<string, string>;
  /**
   * If true (default), the active locale is appended as `lang` query param.
   * Set to false for endpoints that should not be locale-affected (auth flows).
   */
  localized?: boolean;
  /**
   * Abort the request after this many milliseconds.
   * Use `false` to disable (not recommended except for debugging).
   */
  timeoutMs?: number | false;
}

function isAbortOrTimeout(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  if (err.name === 'AbortError' || err.name === 'TimeoutError') return true;
  const cause = (err as Error & { cause?: unknown }).cause;
  if (cause instanceof Error && (cause.name === 'TimeoutError' || cause.name === 'AbortError')) return true;
  if (typeof DOMException !== 'undefined' && cause instanceof DOMException) {
    return cause.name === 'TimeoutError' || cause.name === 'AbortError';
  }
  return false;
}

function appendLangParam(path: string, locale: string): string {
  if (path.includes('lang=')) return path;
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}lang=${encodeURIComponent(locale)}`;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const {
    method = 'GET',
    body,
    auth = false,
    headers: extraHeaders = {},
    localized = true,
    timeoutMs: timeoutOption,
  } = options;
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Accept-Language': activeLocale,
    ...extraHeaders,
  };
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  if (body !== undefined && !isFormData) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = await getAuthToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const finalPath = localized ? appendLangParam(path, activeLocale) : path;
  const requestUrl = `${baseUrl}${finalPath}`;
  const timeoutMs = timeoutOption === false ? undefined : (timeoutOption ?? DEFAULT_REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(requestUrl, {
      method,
      headers,
      body:
        body === undefined
          ? undefined
          : isFormData
            ? (body as FormData)
            : JSON.stringify(body),
      signal: timeoutMs !== undefined ? AbortSignal.timeout(timeoutMs) : undefined,
    });
  } catch (err) {
    if (isAbortOrTimeout(err)) {
      const hint =
        baseUrl === ''
          ? 'Start the Worker (cd backend && npm run dev) so Vite can proxy /api to port 8787.'
          : `Is the API running at ${baseUrl}?`;
      const timeoutError = new ApiClientError(408, `Request timed out after ${timeoutMs}ms. ${hint}`);
      captureFrontendException(timeoutError, { api: { path, method, status: 408 } });
      throw timeoutError;
    }
    captureFrontendException(err, { api: { path, method } });
    throw err;
  }
  let data: unknown = null;
  const text = await response.text();
  if (text) {
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      data = { raw: text } as Record<string, string>;
    }
  }
  if (!response.ok) {
    let message = response.statusText ?? 'Request failed';
    if (data && typeof data === 'object' && data !== null && 'error' in data) {
      const e = (data as { error?: unknown }).error;
      if (typeof e === 'string' && e.length > 0) message = e;
      else if (e && typeof e === 'object' && 'message' in e) {
        const nested = (e as { message?: unknown }).message;
        if (typeof nested === 'string' && nested.length > 0) message = nested;
      }
    }
    const apiError = new ApiClientError(response.status, message);
    captureFrontendException(apiError, { api: { path, method, status: response.status } });
    throw apiError;
  }
  return data as T;
}
