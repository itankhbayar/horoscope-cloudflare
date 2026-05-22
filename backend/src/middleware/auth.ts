import type { Context, MiddlewareHandler } from 'hono';
import { getDb } from '../db/client';
import { verifyTokenForUser } from '../services/authService';
import type { AppBindings, AppVariables } from '../types';
import { logFromContext, metric } from '../utils/logger';

export const authMiddleware: MiddlewareHandler<{
  Bindings: AppBindings;
  Variables: AppVariables;
}> = async (c, next) => {
  const header = c.req.header('Authorization');
  if (!header || !header.startsWith('Bearer ')) {
    metric(c.env, 'auth_failure', { reason: 'missing_bearer' });
    logFromContext(c, 'warn', 'auth_failure', { reason: 'missing_bearer' });
    return c.json({ error: 'Unauthorized' }, 401);
  }
  const token = header.slice('Bearer '.length).trim();
  try {
    const db = getDb(c.env.horoscope_db);
    const payload = await verifyTokenForUser(db, c.env.JWT_SECRET, token);
    c.set('userId', payload.userId);
    c.set('userEmail', payload.email);
    await next();
  } catch (err) {
    metric(c.env, 'auth_failure', { reason: 'invalid_token' });
    logFromContext(c, 'warn', 'auth_failure', { reason: 'invalid_token' });
    return c.json({ error: 'Invalid or expired token' }, 401);
  }
};

export function requireUserId(c: Context<{ Bindings: AppBindings; Variables: AppVariables }>): string {
  const id = c.get('userId');
  if (!id) throw new Error('User not authenticated');
  return id;
}
