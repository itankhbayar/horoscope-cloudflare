import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { getDb } from '../db/client';
import type { DB } from '../db/client';
import { authMiddleware, requireUserId } from '../middleware/auth';
import { getReflectionState, previousDateISO, submitReflection } from '../services/reflectionService';
import { users } from '../db/schema';
import { safeDateISO } from '../utils/localDate';
import { reflectionStateQuerySchema, reflectionSubmitSchema } from '../schemas/reflections';
import { parseJsonBody, parseQuery, isResponse } from '../validators/request';
import type { AppBindings, AppVariables } from '../types';
import { metric } from '../utils/logger';
import { fail, ok } from '../utils/apiResponse';

const router = new Hono<{ Bindings: AppBindings; Variables: AppVariables }>();

router.use('*', authMiddleware);

async function userTimezone(db: DB, userId: string): Promise<string> {
  const row = await db.select({ timezone: users.timezone }).from(users).where(eq(users.id, userId)).get();
  return row?.timezone ?? 'UTC';
}

// Submit (or overwrite) tonight's resonance for the reading the user saw. Idempotent
// on (userId, readingDate). readingDate is constrained to today/yesterday in the
// user's timezone so a late-night check-in still attaches to the right reading.
router.post('/daily', async (c) => {
  const userId = requireUserId(c);
  const body = await parseJsonBody(c, reflectionSubmitSchema);
  if (isResponse(body)) return body;
  const db = getDb(c.env.horoscope_db);
  const timezone = await userTimezone(db, userId);
  const today = safeDateISO(timezone);
  const yesterday = previousDateISO(today);
  if (body.readingDate !== today && body.readingDate !== yesterday) {
    return fail(c, 400, 'BAD_REQUEST', 'readingDate must be today or yesterday');
  }
  const result = await submitReflection(db, userId, body.readingDate, body.resonance);
  metric(c.env, 'reflection_submitted', {
    readingDate: result.readingDate,
    resonance: result.resonance,
    alreadyExisted: result.alreadyExisted,
  });
  return ok(c, result);
});

// One call to drive both the morning acknowledgment block and the evening check-in card.
router.get('/state', async (c) => {
  const userId = requireUserId(c);
  const query = parseQuery(c, reflectionStateQuerySchema);
  if (isResponse(query)) return query;
  const db = getDb(c.env.horoscope_db);
  const timezone = await userTimezone(db, userId);
  const today = query.date ?? safeDateISO(timezone);
  const state = await getReflectionState(db, userId, today);
  return ok(c, state);
});

export default router;
