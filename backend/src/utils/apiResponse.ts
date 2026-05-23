import type { Context } from 'hono';
import type { AppBindings, AppVariables } from '../types';

type AppContext = Context<{ Bindings: AppBindings; Variables: AppVariables }>;

export type ApiErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'PAYLOAD_TOO_LARGE'
  | 'UNSUPPORTED_MEDIA_TYPE'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  | 'SERVICE_UNAVAILABLE'
  | 'VALIDATION_ERROR';

function wantsEnvelope(c: AppContext): boolean {
  return c.req.path.startsWith('/api/v1/');
}

function legacyErrorKey(c: AppContext): boolean {
  return !wantsEnvelope(c);
}

export function ok<T>(c: AppContext, data: T, status = 200): Response {
  return c.json(wantsEnvelope(c) ? { success: true, data } : data, status as never);
}

export function created<T>(c: AppContext, data: T): Response {
  return ok(c, data, 201);
}

export function fail(
  c: AppContext,
  status: number,
  code: ApiErrorCode,
  message: string,
  details?: unknown,
): Response {
  const body = legacyErrorKey(c)
    ? { error: message }
    : { success: false, error: { code, message, ...(details === undefined ? {} : { details }) } };
  return c.json(body, status as never);
}

export function notFound(c: AppContext, message = 'Not found'): Response {
  return fail(c, 404, 'NOT_FOUND', message);
}

export function unauthorized(c: AppContext, message = 'Unauthorized'): Response {
  return fail(c, 401, 'UNAUTHORIZED', message);
}
