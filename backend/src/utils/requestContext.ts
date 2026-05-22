import type { MiddlewareHandler } from 'hono';
import type { AppBindings, AppVariables } from '../types';

export const requestContextMiddleware: MiddlewareHandler<{
  Bindings: AppBindings;
  Variables: AppVariables;
}> = async (c, next) => {
  const requestId = c.req.header('X-Request-ID') || c.req.header('CF-Ray') || crypto.randomUUID();
  c.set('requestId', requestId);
  c.header('X-Request-ID', requestId);
  await next();
};
