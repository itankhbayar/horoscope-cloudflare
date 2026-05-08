import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';

const mocks = vi.hoisted(() => ({
  mockDeleteAccount: vi.fn(),
}));

vi.mock('../db/client', () => ({
  getDb: vi.fn(() => ({})),
}));

vi.mock('../middleware/auth', () => ({
  authMiddleware: async (c: any, next: any) => {
    const header = c.req.header('Authorization');
    if (!header || !header.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    c.set('userId', 'user-1');
    await next();
  },
  requireUserId: (c: any) => c.get('userId'),
}));

vi.mock('../services/accountService', () => ({
  deleteAccount: mocks.mockDeleteAccount,
}));

import accountRoutes from './account';

function createApp(): Hono {
  const app = new Hono();
  app.route('/api/account', accountRoutes);
  return app;
}

const mockEnv = { horoscope_db: {} } as any;

describe('account routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes the authenticated account', async () => {
    mocks.mockDeleteAccount.mockResolvedValue(undefined);
    const app = createApp();
    const res = await app.request(
      '/api/account',
      {
        method: 'DELETE',
        headers: { Authorization: 'Bearer t' },
      },
      mockEnv,
    );

    expect(res.status).toBe(200);
    expect(mocks.mockDeleteAccount).toHaveBeenCalled();
    const json = (await res.json()) as { ok: boolean };
    expect(json.ok).toBe(true);
  });

  it('rejects unauthorized account deletion', async () => {
    const app = createApp();
    const res = await app.request('/api/account', { method: 'DELETE' });
    expect(res.status).toBe(401);
  });
});
