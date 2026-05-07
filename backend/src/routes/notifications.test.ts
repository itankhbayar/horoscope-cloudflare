import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';

const mocks = vi.hoisted(() => ({
  mockGetPrefs: vi.fn(),
  mockUpdatePrefs: vi.fn(),
  mockRegisterToken: vi.fn(),
  mockDisableToken: vi.fn(),
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

vi.mock('../services/notificationService', () => ({
  getNotificationPreferences: mocks.mockGetPrefs,
  updateNotificationPreferences: mocks.mockUpdatePrefs,
  registerPushToken: mocks.mockRegisterToken,
  disablePushToken: mocks.mockDisableToken,
}));

import notificationsRoutes from './notifications';

function createApp(): Hono {
  const app = new Hono();
  app.route('/api/notifications', notificationsRoutes);
  return app;
}

const mockEnv = { horoscope_db: {} } as any;

describe('notifications routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requires auth for preferences', async () => {
    const app = createApp();
    const res = await app.request('/api/notifications/preferences', undefined, mockEnv);
    expect(res.status).toBe(401);
  });

  it('returns preferences for authed user', async () => {
    mocks.mockGetPrefs.mockResolvedValue({
      allEnabled: false,
      saleAlertsEnabled: false,
      horoscopesEnabled: false,
      transitsEnabled: false,
    });
    const app = createApp();
    const res = await app.request(
      '/api/notifications/preferences',
      {
        headers: { Authorization: 'Bearer t' },
      },
      mockEnv,
    );
    expect(res.status).toBe(200);
    expect(mocks.mockGetPrefs).toHaveBeenCalled();
  });

  it('updates preferences via patch', async () => {
    mocks.mockUpdatePrefs.mockResolvedValue({
      allEnabled: true,
      saleAlertsEnabled: true,
      horoscopesEnabled: false,
      transitsEnabled: false,
    });
    const app = createApp();
    const res = await app.request(
      '/api/notifications/preferences',
      {
        method: 'PATCH',
        headers: {
          Authorization: 'Bearer t',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ allEnabled: true, saleAlertsEnabled: true }),
      },
      mockEnv,
    );
    expect(res.status).toBe(200);
    expect(mocks.mockUpdatePrefs).toHaveBeenCalled();
  });

  it('registers and disables push token', async () => {
    mocks.mockRegisterToken.mockResolvedValue(undefined);
    mocks.mockDisableToken.mockResolvedValue(undefined);
    const app = createApp();

    const postRes = await app.request(
      '/api/notifications/push-token',
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer t',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          expoPushToken: 'ExponentPushToken[abc123]',
          platform: 'ios',
        }),
      },
      mockEnv,
    );
    expect(postRes.status).toBe(200);
    expect(mocks.mockRegisterToken).toHaveBeenCalled();

    const deleteRes = await app.request(
      '/api/notifications/push-token',
      {
        method: 'DELETE',
        headers: {
          Authorization: 'Bearer t',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          expoPushToken: 'ExponentPushToken[abc123]',
        }),
      },
      mockEnv,
    );
    expect(deleteRes.status).toBe(200);
    expect(mocks.mockDisableToken).toHaveBeenCalled();
  });
});
