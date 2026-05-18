import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';

const mocks = vi.hoisted(() => ({
  mockGetFullProfile: vi.fn(),
  mockUpdateProfile: vi.fn(),
  mockUpdateProfileAvatar: vi.fn(),
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

vi.mock('../services/profileService', () => ({
  ProfileAvatarError: class ProfileAvatarError extends Error {
    status: number;
    constructor(message: string, status = 400) {
      super(message);
      this.status = status;
    }
  },
  getFullProfile: mocks.mockGetFullProfile,
  recomputeNatalChart: vi.fn(),
  updateProfile: mocks.mockUpdateProfile,
  updateProfileAvatar: mocks.mockUpdateProfileAvatar,
}));

import profileRoutes from './profile';

function createApp(): Hono {
  const app = new Hono();
  app.route('/api/profile', profileRoutes);
  return app;
}

const mockEnv = { horoscope_db: {} } as any;

describe('profile routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches profile for authenticated user', async () => {
    mocks.mockGetFullProfile.mockResolvedValue({
      user: { id: 'user-1', email: 'u@example.com', fullName: 'User', displayName: 'User' },
      birthProfile: null,
      natalChart: null,
    });
    const app = createApp();
    const res = await app.request(
      '/api/profile',
      {
        method: 'GET',
        headers: { Authorization: 'Bearer t' },
      },
      mockEnv,
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.user.email).toBe('u@example.com');
  });

  it('updates profile via PATCH', async () => {
    mocks.mockUpdateProfile.mockResolvedValue({
      user: {
        id: 'user-1',
        email: 'u@example.com',
        fullName: 'User',
        displayName: 'Updated',
        bio: 'bio',
        timezone: 'Asia/Ulaanbaatar',
      },
      birthProfile: null,
      natalChart: null,
    });
    const app = createApp();
    const res = await app.request(
      '/api/profile',
      {
        method: 'PATCH',
        headers: {
          Authorization: 'Bearer t',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ displayName: 'Updated', bio: 'bio', timezone: 'Asia/Ulaanbaatar' }),
      },
      mockEnv,
    );
    expect(res.status).toBe(200);
    expect(mocks.mockUpdateProfile).toHaveBeenCalled();
  });

  it('returns validation error on invalid update payload', async () => {
    mocks.mockUpdateProfile.mockRejectedValue(new Error('Display name must be 2 to 60 characters'));
    const app = createApp();
    const res = await app.request(
      '/api/profile',
      {
        method: 'PATCH',
        headers: {
          Authorization: 'Bearer t',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ displayName: 'x', bio: '', timezone: 'UTC' }),
      },
      mockEnv,
    );
    expect(res.status).toBe(400);
    const json = (await res.json()) as any;
    expect(json.error).toContain('Display name');
  });

  it('rejects unauthorized requests', async () => {
    const app = createApp();
    const res = await app.request('/api/profile', { method: 'GET' });
    expect(res.status).toBe(401);
  });

  it('uploads avatar via multipart form-data', async () => {
    mocks.mockUpdateProfileAvatar.mockResolvedValue({
      avatarUrl: 'https://pub-efa1826642384026bb9d3f05830ec34a.r2.dev/profile/user-1.png',
    });
    const app = createApp();
    const form = new FormData();
    form.append('avatar', new File(['fake'], 'avatar.png', { type: 'image/png' }));
    const res = await app.request(
      '/api/profile/avatar',
      {
        method: 'POST',
        headers: { Authorization: 'Bearer t' },
        body: form,
      },
      {
        ...mockEnv,
        STORAGE: {},
      } as any,
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.avatarUrl).toContain('/profile/user-1.png');
    expect(mocks.mockUpdateProfileAvatar).toHaveBeenCalled();
  });
});

