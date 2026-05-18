import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';

const mocks = vi.hoisted(() => ({
  mockRegisterUser: vi.fn(),
}));

vi.mock('../db/client', () => ({
  getDb: vi.fn(() => ({})),
}));

vi.mock('../services/authService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/authService')>();
  return {
    ...actual,
    registerUser: mocks.mockRegisterUser,
  };
});

import authRoutes from './auth';

function createApp(): Hono {
  const app = new Hono();
  app.route('/api/auth', authRoutes);
  return app;
}

const mockEnv = { horoscope_db: {}, JWT_SECRET: 'test-secret' } as any;

describe('POST /api/auth/register validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockRegisterUser.mockResolvedValue({
      token: 't',
      user: { id: '1', email: 'a@b.com', fullName: 'A', isPremium: false },
    });
  });

  it('returns 400 for invalid latitude type before registerUser', async () => {
    const app = createApp();
    const res = await app.request(
      '/api/auth/register',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Test',
          email: 'test@example.com',
          password: 'secret12',
          birthDate: '1990-01-15',
          birthCity: 'Ulaanbaatar',
          latitude: 'not-a-number',
        }),
      },
      mockEnv,
    );
    expect(res.status).toBe(400);
    expect(mocks.mockRegisterUser).not.toHaveBeenCalled();
    const json = (await res.json()) as { error: string };
    expect(json.error.toLowerCase()).toContain('latitude');
  });

  it('passes validated body to registerUser', async () => {
    const app = createApp();
    const res = await app.request(
      '/api/auth/register',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Test',
          email: 'test@example.com',
          password: 'secret12',
          birthDate: '1990-01-15',
          birthCity: 'Ulaanbaatar',
          latitude: 47.92,
          longitude: 106.91,
          timezoneOffset: 8,
        }),
      },
      mockEnv,
    );
    expect(res.status).toBe(200);
    expect(mocks.mockRegisterUser).toHaveBeenCalledWith(
      {},
      'test-secret',
      expect.objectContaining({
        latitude: 47.92,
        longitude: 106.91,
        timezoneOffset: 8,
      }),
    );
  });
});
