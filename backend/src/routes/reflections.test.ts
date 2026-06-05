import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';

const mocks = vi.hoisted(() => ({
  mockGetDb: vi.fn(),
  mockSubmitReflection: vi.fn(),
  mockGetReflectionState: vi.fn(),
  mockSafeDateISO: vi.fn(),
}));

vi.mock('../db/client', () => ({
  getDb: mocks.mockGetDb,
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

vi.mock('../utils/localDate', () => ({
  safeDateISO: mocks.mockSafeDateISO,
}));

// The route only needs the user's timezone; stub the drizzle select chain to return one.
vi.mock('../db/schema', () => ({ users: {} }));
vi.mock('drizzle-orm', () => ({ eq: vi.fn(() => ({})) }));

vi.mock('../services/reflectionService', async () => {
  const actual = await vi.importActual<typeof import('../services/reflectionService')>(
    '../services/reflectionService',
  );
  return {
    ...actual,
    submitReflection: mocks.mockSubmitReflection,
    getReflectionState: mocks.mockGetReflectionState,
  };
});

import reflectionsRoutes from './reflections';

const mockEnv = { horoscope_db: {} } as any;

function createApp(): Hono {
  const app = new Hono();
  app.route('/api/reflections', reflectionsRoutes);
  return app;
}

function dbReturningTimezone(tz: string | null): any {
  return {
    select: () => ({
      from: () => ({
        where: () => ({ get: async () => (tz === null ? undefined : { timezone: tz }) }),
      }),
    }),
  };
}

describe('reflection routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockGetDb.mockReturnValue(dbReturningTimezone('UTC'));
    mocks.mockSafeDateISO.mockReturnValue('2026-06-04');
    mocks.mockSubmitReflection.mockResolvedValue({ readingDate: '2026-06-04', resonance: 2, alreadyExisted: false });
    mocks.mockGetReflectionState.mockResolvedValue({ todayCheckIn: null, yesterday: null, checkInPending: false });
  });

  async function post(body: unknown, auth = true): Promise<Response> {
    return createApp().request(
      '/api/reflections/daily',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: 'Bearer t' } : {}) },
        body: JSON.stringify(body),
      },
      mockEnv,
    );
  }

  it('requires auth on submit', async () => {
    const res = await post({ readingDate: '2026-06-04', resonance: 2 }, false);
    expect(res.status).toBe(401);
    expect(mocks.mockSubmitReflection).not.toHaveBeenCalled();
  });

  it('requires auth on state', async () => {
    const res = await createApp().request('/api/reflections/state', {}, mockEnv);
    expect(res.status).toBe(401);
  });

  it('submits a valid reflection', async () => {
    const res = await post({ readingDate: '2026-06-04', resonance: 2 });
    expect(res.status).toBe(200);
    expect(mocks.mockSubmitReflection).toHaveBeenCalledWith(expect.anything(), 'user-1', '2026-06-04', 2);
    await expect(res.json()).resolves.toMatchObject({ readingDate: '2026-06-04', resonance: 2, alreadyExisted: false });
  });

  it('accepts yesterday as a valid readingDate', async () => {
    mocks.mockSubmitReflection.mockResolvedValue({ readingDate: '2026-06-03', resonance: 1, alreadyExisted: false });
    const res = await post({ readingDate: '2026-06-03', resonance: 1 });
    expect(res.status).toBe(200);
    expect(mocks.mockSubmitReflection).toHaveBeenCalledWith(expect.anything(), 'user-1', '2026-06-03', 1);
  });

  it('rejects a readingDate outside today/yesterday', async () => {
    const res = await post({ readingDate: '2026-06-01', resonance: 2 });
    expect(res.status).toBe(400);
    expect(mocks.mockSubmitReflection).not.toHaveBeenCalled();
  });

  it('rejects an out-of-range resonance', async () => {
    const res = await post({ readingDate: '2026-06-04', resonance: 5 });
    expect(res.status).toBe(400);
    expect(mocks.mockSubmitReflection).not.toHaveBeenCalled();
  });

  it('returns reflection state', async () => {
    mocks.mockGetReflectionState.mockResolvedValue({
      todayCheckIn: null,
      yesterday: { readingDate: '2026-06-03', resonance: 3 },
      checkInPending: true,
    });
    const res = await createApp().request(
      '/api/reflections/state',
      { headers: { Authorization: 'Bearer t' } },
      mockEnv,
    );
    expect(res.status).toBe(200);
    expect(mocks.mockGetReflectionState).toHaveBeenCalledWith(expect.anything(), 'user-1', '2026-06-04');
    await expect(res.json()).resolves.toMatchObject({ checkInPending: true });
  });
});
