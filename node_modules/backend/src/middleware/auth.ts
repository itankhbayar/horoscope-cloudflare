import type { Context, MiddlewareHandler } from 'hono';
import { verifyToken } from '../services/authService';
import type { AppBindings, AppVariables } from '../types';

export const authMiddleware: MiddlewareHandler<{
  Bindings: AppBindings;
  Variables: AppVariables;
}> = async (c, next) => {
  const header = c.req.header('Authorization');
  if (!header || !header.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  const token = header.slice('Bearer '.length).trim();
  try {
    const payload = await verifyToken(c.env.JWT_SECRET, token);
    c.set('userId', payload.userId);
    c.set('userEmail', payload.email);
    await next();
  } catch (err) {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }
};

export function requireUserId(c: Context<{ Bindings: AppBindings; Variables: AppVariables }>): string {
  const id = c.get('userId');
  if (!id) throw new Error('User not authenticated');
  return id;
}
