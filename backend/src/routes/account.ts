import { Hono } from 'hono';
import { getDb } from '../db/client';
import { authMiddleware, requireUserId } from '../middleware/auth';
import { deleteAccount, exportAccountData } from '../services/accountService';
import type { AppBindings, AppVariables } from '../types';
import { captureException } from '../utils/sentry';
import { logFromContext } from '../utils/logger';
import { fail, ok } from '../utils/apiResponse';

const router = new Hono<{ Bindings: AppBindings; Variables: AppVariables }>();

router.use('*', authMiddleware);

router.get('/export', async (c) => {
  const db = getDb(c.env.horoscope_db);
  const userId = requireUserId(c);

  try {
    const data = await exportAccountData(db, userId);
    c.header('Content-Disposition', 'attachment; filename="astralis-data-export.json"');
    return ok(c, data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to export account data';
    if (message === 'User not found') return fail(c, 404, 'NOT_FOUND', message);
    logFromContext(c, 'error', 'export_account_data_failed', { error: err });
    captureException(err, { route: { path: '/api/account/export', method: 'GET' } });
    return fail(c, 500, 'INTERNAL_ERROR', 'Failed to export account data');
  }
});

router.delete('/', async (c) => {
  const db = getDb(c.env.horoscope_db);
  const userId = requireUserId(c);

  try {
    await deleteAccount(db, userId, c.env.STORAGE);
    return ok(c, { ok: true, message: 'Account deleted' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete account';
    if (message === 'User not found') {
      return fail(c, 404, 'NOT_FOUND', message);
    }
    logFromContext(c, 'error', 'delete_account_failed', { error: err });
    captureException(err, { route: { path: '/api/account', method: 'DELETE' } });
    return fail(c, 500, 'INTERNAL_ERROR', 'Failed to delete account');
  }
});

export default router;
