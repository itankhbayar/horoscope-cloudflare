import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';

const mocks = vi.hoisted(() => ({
  mockGetDb: vi.fn(),
  mockCompleteDailyRitual: vi.fn(),
  mockMarkFirstHoroscopeReveal: vi.fn(),
}));

vi.mock('../db/client', () => ({
  getDb: mocks.mockGetDb,
}));

vi.mock('../services/activationService', () => ({
  markFirstHoroscopeReveal: mocks.mockMarkFirstHoroscopeReveal,
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

vi.mock('../services/streakService', () => ({
  currentStreakDateISO: () => '2026-05-20',
  completeDailyRitual: mocks.mockCompleteDailyRitual,
}));

import ritualsRoutes from './rituals';

const mockEnv = { horoscope_db: {} } as any;

function createApp(): Hono {
  const app = new Hono();
  app.route('/api/rituals', ritualsRoutes);
  return app;
}

describe('ritual routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockGetDb.mockReturnValue({});
    mocks.mockMarkFirstHoroscopeReveal.mockResolvedValue(false);
    mocks.mockCompleteDailyRitual.mockResolvedValue({
      data: {
        streakCount: 7,
        longestStreakCount: 7,
        streakLastDate: '2026-05-20',
        streakFreezes: 1,
        streakFreezeAwarded: true,
        streakFreezeCap: 1,
        streakFreezeAwardReason: '7_day',
        isNewStreakDay: true,
        streakPreservedByFreeze: false,
        milestoneReached: 7,
        nextMilestone: 14,
        streakSegment: 'aligned',
      },
      analyticsEvents: ['streak_milestone'],
      completion: {
        currentStreak: 7,
        longestStreak: 7,
        freezeCount: 1,
        freezeCap: 1,
        nextMilestone: 14,
        milestoneReached: 7,
        streakFreezeAwarded: true,
        alreadyCompletedToday: false,
        shouldCelebrate: true,
        completedDate: '2026-05-20',
        streakLastDate: '2026-05-20',
        streakPreservedByFreeze: false,
        streakFreezeAwardReason: '7_day',
        streakSegment: 'aligned',
      },
    });
  });

  it('requires auth', async () => {
    const res = await createApp().request('/api/rituals/daily/complete');
    expect(res.status).toBe(401);
    expect(mocks.mockCompleteDailyRitual).not.toHaveBeenCalled();
  });

  it('completes today daily ritual and returns completion state', async () => {
    const res = await createApp().request(
      '/api/rituals/daily/complete',
      {
        method: 'POST',
        headers: { Authorization: 'Bearer token' },
      },
      mockEnv,
    );

    expect(res.status).toBe(200);
    expect(mocks.mockCompleteDailyRitual).toHaveBeenCalledWith({}, 'user-1', '2026-05-20');
    await expect(res.json()).resolves.toMatchObject({
      currentStreak: 7,
      longestStreak: 7,
      freezeCount: 1,
      freezeCap: 1,
      nextMilestone: 14,
      milestoneReached: 7,
      streakFreezeAwarded: true,
      alreadyCompletedToday: false,
      shouldCelebrate: true,
      completedDate: '2026-05-20',
    });
  });

  async function postComplete() {
    return createApp().request(
      '/api/rituals/daily/complete',
      { method: 'POST', headers: { Authorization: 'Bearer token' } },
      mockEnv,
    );
  }

  it('returns firstHoroscopeReveal: true when the milestone is claimed (first reveal)', async () => {
    mocks.mockMarkFirstHoroscopeReveal.mockResolvedValue(true);

    const res = await postComplete();

    expect(res.status).toBe(200);
    expect(mocks.mockMarkFirstHoroscopeReveal).toHaveBeenCalledWith({}, 'user-1');
    await expect(res.json()).resolves.toMatchObject({ firstHoroscopeReveal: true });
  });

  it('returns firstHoroscopeReveal: false on a later reveal (already claimed / another device)', async () => {
    mocks.mockMarkFirstHoroscopeReveal.mockResolvedValue(false);

    const res = await postComplete();

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ firstHoroscopeReveal: false });
  });

  it('does not alter the existing completion payload (reveal flow unchanged)', async () => {
    mocks.mockMarkFirstHoroscopeReveal.mockResolvedValue(true);

    const res = await postComplete();
    const body = await res.json();

    // Streak/ritual completion fields are returned exactly as before, untouched.
    expect(body).toMatchObject({
      currentStreak: 7,
      longestStreak: 7,
      streakSegment: 'aligned',
      streakFreezeAwardReason: '7_day',
      shouldCelebrate: true,
    });
    expect(mocks.mockCompleteDailyRitual).toHaveBeenCalledWith({}, 'user-1', '2026-05-20');
  });
});
