import { Hono } from 'hono';
import { getDb } from '../db/client';
import { authMiddleware, requireUserId } from '../middleware/auth';
import { deleteAccount } from '../services/accountService';
import type { AppBindings, AppVariables } from '../types';

const router = new Hono<{ Bindings: AppBindings; Variables: AppVariables }>();

router.use('*', authMiddleware);

router.delete('/', async (c) => {
  const db = getDb(c.env.horoscope_db);
  const userId = requireUserId(c);

  try {
    await deleteAccount(db, userId, c.env.STORAGE);
    return c.json({ ok: true, message: 'Account deleted' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete account';
    if (message === 'User not found') {
      return c.json({ error: message }, 404);
    }
    console.error('delete account failed', err);
    return c.json({ error: 'Failed to delete account' }, 500);
  }
});

export default router;
