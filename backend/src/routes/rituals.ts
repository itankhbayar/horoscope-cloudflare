import { Hono } from 'hono';
import { getDb } from '../db/client';
import { authMiddleware, requireUserId } from '../middleware/auth';
import { completeDailyRitual, currentStreakDateISO } from '../services/streakService';
import type { AppBindings, AppVariables } from '../types';
import { metric } from '../utils/logger';
import { ok } from '../utils/apiResponse';

const router = new Hono<{ Bindings: AppBindings; Variables: AppVariables }>();

router.use('*', authMiddleware);

router.post('/daily/complete', async (c) => {
  const userId = requireUserId(c);
  const db = getDb(c.env.horoscope_db);
  const completedDate = currentStreakDateISO();
  const result = await completeDailyRitual(db, userId, completedDate);

  metric(c.env, 'daily_ritual_completed', {
    completedDate,
    currentStreak: result.completion.currentStreak,
    alreadyCompletedToday: result.completion.alreadyCompletedToday,
    shouldCelebrate: result.completion.shouldCelebrate,
    milestone: result.completion.milestoneReached ?? undefined,
  });
  for (const event of result.analyticsEvents) {
    metric(c.env, event, {
      streakCount: result.data.streakCount,
      milestone: result.data.milestoneReached ?? undefined,
      freezes: result.data.streakFreezes,
    });
  }

  return ok(c, result.completion);
});

export default router;
