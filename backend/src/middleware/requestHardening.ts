import type { MiddlewareHandler } from 'hono';
import type { AppBindings, AppVariables } from '../types';
import { fail } from '../utils/apiResponse';

const MAX_JSON_BYTES = 128 * 1024;

function mayHaveBody(method: string): boolean {
  return method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE';
}

function skipsJsonContentType(path: string): boolean {
  return (
    path.endsWith('/billing/webhook') ||
    path.endsWith('/profile/avatar')
  );
}

export const requestHardeningMiddleware: MiddlewareHandler<{
  Bindings: AppBindings;
  Variables: AppVariables;
}> = async (c, next) => {
  if (!mayHaveBody(c.req.method)) {
    await next();
    return;
  }

  const contentLength = c.req.header('content-length');
  const hasBody = contentLength !== undefined && Number(contentLength) > 0;
  if (contentLength && Number(contentLength) > MAX_JSON_BYTES && !c.req.path.endsWith('/profile/avatar')) {
    return fail(c, 413, 'PAYLOAD_TOO_LARGE', 'Request body is too large');
  }

  if (hasBody && !skipsJsonContentType(c.req.path)) {
    const contentType = c.req.header('content-type') ?? '';
    if (!contentType.toLowerCase().includes('application/json')) {
      return fail(c, 415, 'UNSUPPORTED_MEDIA_TYPE', 'Content-Type must be application/json');
    }
  }

  await next();
};
