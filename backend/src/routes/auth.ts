import { Hono } from 'hono';
import { getDb } from '../db/client';
import { HttpError, getUserById, loginUser, registerUser } from '../services/authService';
import { authMiddleware, requireUserId } from '../middleware/auth';
import { createRateLimitMiddleware } from '../middleware/rateLimit';
import {
  checkBreachedPassword,
  breachedPasswordOptionsFromEnv,
} from '../services/breachedPasswordService';
import type { AppBindings, AppVariables } from '../types';
import { formatZodError } from '../validation/hook';
import { registerBodySchema } from '../validation/authSchemas';
import { captureException } from '../utils/sentry';
import { logFromContext, metric } from '../utils/logger';

const router = new Hono<{ Bindings: AppBindings; Variables: AppVariables }>();

const loginRateLimit = createRateLimitMiddleware({
  keyPrefix: 'auth:login',
  limit: 5,
  windowMs: 60_000,
});

const registerRateLimit = createRateLimitMiddleware({
  keyPrefix: 'auth:register',
  limit: 3,
  windowMs: 60_000,
});

const REGISTER_ERROR = 'Registration failed';

router.post('/register', registerRateLimit, async (c) => {
  try {
    const rawBody = await c.req.json();
    const parsed = registerBodySchema.safeParse(rawBody);
    if (!parsed.success) return c.json({ error: formatZodError(parsed.error) }, 400);

    const breachedPasswordCheck = await checkBreachedPassword(
      parsed.data.password,
      breachedPasswordOptionsFromEnv(c.env),
    );
    if (breachedPasswordCheck.status === 'breached' || breachedPasswordCheck.status === 'unavailable') {
      return c.json({ error: 'Password does not meet security requirements' }, 400);
    }

    const db = getDb(c.env.horoscope_db);
    const result = await registerUser(db, c.env.JWT_SECRET, parsed.data);
    metric(c.env, 'signup_completed');
    return c.json(result);
  } catch (err) {
    if (err instanceof HttpError) {
      metric(c.env, 'auth_failure', { route: 'register', status: err.status });
      if (err.status === 409) return c.json({ error: REGISTER_ERROR }, 400);
      return c.json({ error: err.message }, err.status as any);
    }
    logFromContext(c, 'error', 'register_failed', { error: err });
    captureException(err, { route: { path: '/api/auth/register' } });
    return c.json({ error: REGISTER_ERROR }, 500);
  }
});

router.post('/login', loginRateLimit, async (c) => {
  try {
    const body = await c.req.json();
    const db = getDb(c.env.horoscope_db);
    const result = await loginUser(db, c.env.JWT_SECRET, body);
    metric(c.env, 'login_completed');
    return c.json(result);
  } catch (err) {
    if (err instanceof HttpError) {
      metric(c.env, 'auth_failure', { route: 'login', status: err.status });
      return c.json({ error: err.message }, err.status as any);
    }
    logFromContext(c, 'error', 'login_failed', { error: err });
    captureException(err, { route: { path: '/api/auth/login' } });
    return c.json({ error: 'Login failed' }, 500);
  }
});

router.post('/logout', (c) => c.json({ ok: true }));

router.get('/me', authMiddleware, async (c) => {
  const db = getDb(c.env.horoscope_db);
  const userId = requireUserId(c);
  const user = await getUserById(db, userId);
  if (!user) return c.json({ error: 'User not found' }, 404);
  return c.json({
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    createdAt: user.createdAt,
    isPremium: Boolean(user.isPremium),
  });
});

export default router;
