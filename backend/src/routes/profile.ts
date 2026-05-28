import { Hono } from 'hono';
import { getDb } from '../db/client';
import { authMiddleware, requireUserId } from '../middleware/auth';
import {
  getFullProfile,
  ProfileAvatarError,
  recomputeNatalChart,
  updateProfile,
  updateProfileAvatar,
} from '../services/profileService';
import type { AppBindings, AppVariables } from '../types';
import { captureException } from '../utils/sentry';
import { logFromContext } from '../utils/logger';
import { updateProfileSchema, avatarFormSchema } from '../schemas/profile';
import { parseJsonBody, parseFormData, isResponse } from '../validators/request';
import { fail, ok } from '../utils/apiResponse';

const router = new Hono<{ Bindings: AppBindings; Variables: AppVariables }>();

router.use('*', authMiddleware);

router.get('/', async (c) => {
  const db = getDb(c.env.horoscope_db);
  const userId = requireUserId(c);
  try {
    const profile = await getFullProfile(db, userId);
    return ok(c, profile);
  } catch (err) {
    logFromContext(c, 'error', 'profile_fetch_failed', { error: err, userId });
    captureException(err, { route: { path: '/api/profile', method: 'GET' }, user: { id: userId } });
    return fail(c, 500, 'INTERNAL_ERROR', 'Failed to load profile');
  }
});

router.post('/recompute', async (c) => {
  const db = getDb(c.env.horoscope_db);
  const userId = requireUserId(c);
  try {
    await recomputeNatalChart(db, userId);
    const profile = await getFullProfile(db, userId);
    return ok(c, profile);
  } catch (err) {
    return fail(c, 400, 'BAD_REQUEST', (err as Error).message);
  }
});

router.patch('/', async (c) => {
  const db = getDb(c.env.horoscope_db);
  const userId = requireUserId(c);
  try {
    const body = await parseJsonBody(c, updateProfileSchema);
    if (isResponse(body)) return body;
    const profile = await updateProfile(db, userId, {
      ...body,
      timezoneOffset: body.timezoneOffset ?? undefined,
    });
    return ok(c, profile);
  } catch (err) {
    return fail(c, 400, 'BAD_REQUEST', (err as Error).message);
  }
});

router.post('/avatar', async (c) => {
  const db = getDb(c.env.horoscope_db);
  const userId = requireUserId(c);
  try {
    const form = await parseFormData(c, avatarFormSchema);
    if (isResponse(form)) return form;
    const publicBaseUrl =
      c.env.AVATAR_PUBLIC_BASE_URL ??
      'https://pub-efa1826642384026bb9d3f05830ec34a.r2.dev';
    const result = await updateProfileAvatar(db, userId, c.env.STORAGE, publicBaseUrl, form.avatar);
    return ok(c, result);
  } catch (err) {
    if (err instanceof ProfileAvatarError) {
      const status =
        err.status === 413 ? 413 : err.status === 503 ? 503 : 400;
      return fail(c, status, status === 413 ? 'PAYLOAD_TOO_LARGE' : 'BAD_REQUEST', err.message);
    }
    const msg = err instanceof Error ? `${err.message}\n${(err as Error & { cause?: Error }).cause?.message ?? ''}` : String(err);
    if (msg.includes('no such column: avatar_url') || msg.includes('no such column: display_name')) {
      logFromContext(c, 'error', 'avatar_upload_schema_missing_columns', { error: err });
      captureException(err, { route: { path: '/api/profile/avatar' } });
      return fail(
        c,
        503,
        'SERVICE_UNAVAILABLE',
        'Database is missing profile columns. From backend/, run: npx wrangler d1 migrations apply horoscope-db --local. If that fails on 0004 (duplicate stripe columns), see backend/README.md.',
      );
    }
    logFromContext(c, 'error', 'avatar_upload_failed', { error: err });
    captureException(err, { route: { path: '/api/profile/avatar' } });
    return fail(c, 500, 'INTERNAL_ERROR', 'Failed to upload avatar');
  }
});

export default router;
