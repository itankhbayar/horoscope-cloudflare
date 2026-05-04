import { getStorage } from './storage';
import type { ApiError } from './types';

export const TOKEN_KEY = 'horoscope_token';

let baseUrl: string =
  typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_BASE_URL
    ? (import.meta as any).env.VITE_API_BASE_URL
    : 'http://127.0.0.1:8787';

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
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
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
  return cause instanceof DOMException && (cause.name === 'TimeoutError' || cause.name === 'AbortError');
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
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = await getAuthToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const finalPath = localized ? appendLangParam(path, activeLocale) : path;
  const timeoutMs = timeoutOption === false ? undefined : (timeoutOption ?? DEFAULT_REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${finalPath}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: timeoutMs !== undefined ? AbortSignal.timeout(timeoutMs) : undefined,
    });
  } catch (err) {
    if (isAbortOrTimeout(err)) {
      const hint =
        baseUrl === ''
          ? 'Start the Worker (cd backend && npm run dev) so Vite can proxy /api to port 8787.'
          : `Is the API running at ${baseUrl}?`;
      throw new ApiClientError(408, `Request timed out after ${timeoutMs}ms. ${hint}`);
    }
    throw err;
  }
  let data: any = null;
  const text = await response.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }
  if (!response.ok) {
    const message = data?.error ?? response.statusText ?? 'Request failed';
    throw new ApiClientError(response.status, message);
  }
  return data as T;
}
