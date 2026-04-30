import { Hono } from 'hono';
import { getDb } from '../db/client';
import { HttpError, getUserById, loginUser, registerUser } from '../services/authService';
import { authMiddleware, requireUserId } from '../middleware/auth';
import type { AppBindings, AppVariables } from '../types';

const router = new Hono<{ Bindings: AppBindings; Variables: AppVariables }>();

router.post('/register', async (c) => {
  try {
    const body = await c.req.json();
    const db = getDb(c.env.horoscope_db);
    const result = await registerUser(db, c.env.JWT_SECRET, body);
    return c.json(result);
  } catch (err) {
    if (err instanceof HttpError) return c.json({ error: err.message }, err.status as any);
    console.error('register failed', err);
    return c.json({ error: 'Registration failed' }, 500);
  }
});

router.post('/login', async (c) => {
  try {
    const body = await c.req.json();
    const db = getDb(c.env.horoscope_db);
    const result = await loginUser(db, c.env.JWT_SECRET, body);
    return c.json(result);
  } catch (err) {
    if (err instanceof HttpError) return c.json({ error: err.message }, err.status as any);
    console.error('login failed', err);
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
  });
});

export default router;
