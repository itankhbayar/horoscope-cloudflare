import type { MiddlewareHandler } from 'hono';
import type { AppBindings, AppVariables } from '../types';
import { logFromContext } from './logger';

export const requestContextMiddleware: MiddlewareHandler<{
  Bindings: AppBindings;
  Variables: AppVariables;
}> = async (c, next) => {
  const started = Date.now();
  const requestId = c.req.header('X-Request-ID') || c.req.header('CF-Ray') || crypto.randomUUID();
  c.set('requestId', requestId);
  c.header('X-Request-ID', requestId);
  try {
    await next();
  } finally {
    logFromContext(c, 'info', 'request_completed', {
      status: c.res.status,
      durationMs: Date.now() - started,
    });
  }
};
