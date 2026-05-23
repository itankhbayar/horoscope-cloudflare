import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import { getClientIp, resetInMemoryRateLimits } from '../middleware/rateLimit';

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  loginUser: vi.fn(),
  registerUser: vi.fn(),
}));

vi.mock('../db/client', () => ({
  getDb: mocks.getDb,
}));

vi.mock('../services/authService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/authService')>();
  return {
    ...actual,
    loginUser: mocks.loginUser,
    registerUser: mocks.registerUser,
  };
});

import authRoutes from './auth';
import { HttpError } from '../services/authService';

const mockEnv = { horoscope_db: {}, JWT_SECRET: 'test-secret' } as any;

function createApp(): Hono {
  const app = new Hono();
  app.route('/api/auth', authRoutes);
  return app;
}

function jsonPost(ip: string, body: unknown = {}): RequestInit {
  return {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'CF-Connecting-IP': ip,
    },
    body: JSON.stringify(body),
  };
}

function registerBody(email = 'new@example.com'): Record<string, unknown> {
  return {
    fullName: 'New User',
    email,
    password: 'secure passphrase',
    birthDate: '1990-01-01',
    birthCity: 'Ulaanbaatar',
    birthDataConsent: true,
  };
}

function loginBody(email = 'u@example.com'): Record<string, unknown> {
  return {
    email,
    password: 'secret12',
  };
}

describe('auth route rate limiting', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-20T00:00:00.000Z'));
    resetInMemoryRateLimits();
    vi.clearAllMocks();
    mocks.getDb.mockReturnValue({});
    mocks.loginUser.mockResolvedValue({
      token: 'login-token',
      user: { id: 'user-1', email: 'u@example.com', fullName: 'User', isPremium: false },
    });
    mocks.registerUser.mockResolvedValue({
      token: 'register-token',
      user: { id: 'user-2', email: 'new@example.com', fullName: 'New User', isPremium: false },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    resetInMemoryRateLimits();
  });

  it('allows login requests under the per-minute limit', async () => {
    const app = createApp();

    for (let i = 0; i < 5; i += 1) {
      const res = await app.request('/api/auth/login', jsonPost('203.0.113.10', loginBody()), mockEnv);
      expect(res.status).toBe(200);
    }

    expect(mocks.loginUser).toHaveBeenCalledTimes(5);
  });

  it('returns 429 with Retry-After after exceeding the login limit', async () => {
    const app = createApp();

    for (let i = 0; i < 5; i += 1) {
      await app.request('/api/auth/login', jsonPost('203.0.113.11', loginBody()), mockEnv);
    }
    const limited = await app.request('/api/auth/login', jsonPost('203.0.113.11', loginBody()), mockEnv);

    expect(limited.status).toBe(429);
    expect(limited.headers.get('Retry-After')).toBe('60');
    await expect(limited.json()).resolves.toEqual({
      error: 'Too many requests, please try again later',
    });
    expect(mocks.loginUser).toHaveBeenCalledTimes(5);
  });

  it('returns 429 after exceeding the register limit', async () => {
    const app = createApp();

    for (let i = 0; i < 3; i += 1) {
      await app.request(
        '/api/auth/register',
        jsonPost('203.0.113.12', registerBody(`new${i}@example.com`)),
        mockEnv,
      );
    }
    const limited = await app.request(
      '/api/auth/register',
      jsonPost('203.0.113.12', registerBody('limited@example.com')),
      mockEnv,
    );

    expect(limited.status).toBe(429);
    expect(limited.headers.get('Retry-After')).toBe('60');
    await expect(limited.json()).resolves.toEqual({
      error: 'Too many requests, please try again later',
    });
    expect(mocks.registerUser).toHaveBeenCalledTimes(3);
  });

  it('allows register requests under the per-minute limit', async () => {
    const app = createApp();

    for (let i = 0; i < 3; i += 1) {
      const res = await app.request(
        '/api/auth/register',
        jsonPost('203.0.113.16', registerBody(`allowed${i}@example.com`)),
        mockEnv,
      );
      expect(res.status).toBe(200);
    }

    expect(mocks.registerUser).toHaveBeenCalledTimes(3);
  });

  it('includes Retry-After header when rate limited', async () => {
    const app = createApp();

    for (let i = 0; i < 5; i += 1) {
      await app.request('/api/auth/login', jsonPost('203.0.113.17', loginBody()), mockEnv);
    }
    const limited = await app.request('/api/auth/login', jsonPost('203.0.113.17', loginBody()), mockEnv);

    expect(limited.status).toBe(429);
    expect(limited.headers.has('Retry-After')).toBe(true);
  });

  it('uses CF-Connecting-IP before forwarded headers for the rate limit key', async () => {
    const app = createApp();

    expect(
      getClientIp(
        new Headers({
          'CF-Connecting-IP': '203.0.113.18',
          'X-Forwarded-For': '198.51.100.1, 198.51.100.2',
          'X-Real-IP': '192.0.2.1',
        }),
      ),
    ).toBe('203.0.113.18');

    for (let i = 0; i < 5; i += 1) {
      const res = await app.request(
        '/api/auth/login',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'CF-Connecting-IP': '203.0.113.18',
            'X-Forwarded-For': `198.51.100.${i}, 198.51.100.200`,
          },
          body: JSON.stringify(loginBody()),
        },
        mockEnv,
      );
      expect(res.status).toBe(200);
    }

    const sameCfIp = await app.request(
      '/api/auth/login',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CF-Connecting-IP': '203.0.113.18',
          'X-Forwarded-For': '198.51.100.250',
        },
        body: JSON.stringify(loginBody()),
      },
      mockEnv,
    );
    const differentCfIp = await app.request(
      '/api/auth/login',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CF-Connecting-IP': '203.0.113.19',
          'X-Forwarded-For': '198.51.100.250',
        },
        body: JSON.stringify(loginBody()),
      },
      mockEnv,
    );

    expect(sameCfIp.status).toBe(429);
    expect(differentCfIp.status).toBe(200);
  });

  it('keeps separate limits for different IP addresses', async () => {
    const app = createApp();

    for (let i = 0; i < 5; i += 1) {
      await app.request('/api/auth/login', jsonPost('203.0.113.13', loginBody()), mockEnv);
    }

    const limited = await app.request('/api/auth/login', jsonPost('203.0.113.13', loginBody()), mockEnv);
    const otherIp = await app.request('/api/auth/login', jsonPost('203.0.113.14', loginBody()), mockEnv);

    expect(limited.status).toBe(429);
    expect(otherIp.status).toBe(200);
  });

  it('lets auth routes work normally under the limit', async () => {
    const app = createApp();

    const login = await app.request(
      '/api/auth/login',
      jsonPost('203.0.113.15', {
        email: 'u@example.com',
        password: 'secret12',
      }),
      mockEnv,
    );
    const register = await app.request(
      '/api/auth/register',
      jsonPost('203.0.113.15', {
        fullName: 'New User',
        email: 'new@example.com',
        password: 'secret12',
        birthDate: '1990-01-01',
        birthCity: 'Ulaanbaatar',
        birthDataConsent: true,
      }),
      mockEnv,
    );

    expect(login.status).toBe(200);
    expect(register.status).toBe(200);
    expect(mocks.loginUser).toHaveBeenCalledWith(
      {},
      'test-secret',
      expect.objectContaining({ email: 'u@example.com' }),
      { accessTokenTtlSeconds: undefined },
    );
    expect(mocks.registerUser).toHaveBeenCalledWith(
      {},
      'test-secret',
      expect.objectContaining({ email: 'new@example.com' }),
      { accessTokenTtlSeconds: undefined },
    );
  });

  it('does not expose duplicate-email registration failures', async () => {
    const app = createApp();
    mocks.registerUser.mockRejectedValueOnce(new HttpError(409, 'Email already registered'));

    const res = await app.request(
      '/api/auth/register',
      jsonPost('203.0.113.19', registerBody('existing@example.com')),
      mockEnv,
    );

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: 'Registration failed' });
  });
});
