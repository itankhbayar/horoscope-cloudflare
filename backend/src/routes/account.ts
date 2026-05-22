import { Hono } from 'hono';
import { getDb } from '../db/client';
import { authMiddleware, requireUserId } from '../middleware/auth';
import { deleteAccount, exportAccountData } from '../services/accountService';
import type { AppBindings, AppVariables } from '../types';
import { captureException } from '../utils/sentry';
import { logFromContext } from '../utils/logger';

const router = new Hono<{ Bindings: AppBindings; Variables: AppVariables }>();

router.use('*', authMiddleware);

router.get('/export', async (c) => {
  const db = getDb(c.env.horoscope_db);
  const userId = requireUserId(c);

  try {
    const data = await exportAccountData(db, userId);
    c.header('Content-Disposition', 'attachment; filename="astralis-data-export.json"');
    return c.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to export account data';
    if (message === 'User not found') return c.json({ error: message }, 404);
    logFromContext(c, 'error', 'export_account_data_failed', { error: err });
    captureException(err, { route: { path: '/api/account/export', method: 'GET' } });
    return c.json({ error: 'Failed to export account data' }, 500);
  }
});

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
    logFromContext(c, 'error', 'delete_account_failed', { error: err });
    captureException(err, { route: { path: '/api/account', method: 'DELETE' } });
    return c.json({ error: 'Failed to delete account' }, 500);
  }
});

export default router;
