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

const router = new Hono<{ Bindings: AppBindings; Variables: AppVariables }>();

function isUploadFile(v: unknown): v is File {
  return Boolean(
    v &&
      typeof v === 'object' &&
      'arrayBuffer' in v &&
      'type' in v &&
      'size' in v &&
      'name' in v,
  );
}

router.use('*', authMiddleware);

router.get('/', async (c) => {
  const db = getDb(c.env.horoscope_db);
  const userId = requireUserId(c);
  try {
    const profile = await getFullProfile(db, userId);
    return c.json(profile);
  } catch (err) {
    return c.json({ error: (err as Error).message }, 404);
  }
});

router.post('/recompute', async (c) => {
  const db = getDb(c.env.horoscope_db);
  const userId = requireUserId(c);
  try {
    await recomputeNatalChart(db, userId);
    const profile = await getFullProfile(db, userId);
    return c.json(profile);
  } catch (err) {
    return c.json({ error: (err as Error).message }, 400);
  }
});

router.patch('/', async (c) => {
  const db = getDb(c.env.horoscope_db);
  const userId = requireUserId(c);
  try {
    const body = await c.req.json();
    const profile = await updateProfile(db, userId, body);
    return c.json(profile);
  } catch (err) {
    return c.json({ error: (err as Error).message }, 400);
  }
});

router.post('/avatar', async (c) => {
  const db = getDb(c.env.horoscope_db);
  const userId = requireUserId(c);
  try {
    const contentType = c.req.header('Content-Type') ?? '';
    if (!contentType.toLowerCase().includes('multipart/form-data')) {
      return c.json({ error: 'Content-Type must be multipart/form-data' }, 400);
    }
    const form = await c.req.formData();
    const raw = form.get('avatar');
    if (!isUploadFile(raw)) {
      return c.json({ error: 'avatar file is required' }, 400);
    }
    const publicBaseUrl =
      c.env.AVATAR_PUBLIC_BASE_URL ??
      'https://pub-efa1826642384026bb9d3f05830ec34a.r2.dev';
    const result = await updateProfileAvatar(db, userId, c.env.STORAGE, publicBaseUrl, raw);
    return c.json(result);
  } catch (err) {
    if (err instanceof ProfileAvatarError) {
      const status =
        err.status === 413 ? 413 : err.status === 503 ? 503 : 400;
      return c.json({ error: err.message }, status);
    }
    const msg = err instanceof Error ? `${err.message}\n${(err as Error & { cause?: Error }).cause?.message ?? ''}` : String(err);
    if (msg.includes('no such column: avatar_url') || msg.includes('no such column: display_name')) {
      console.error('avatar upload failed (D1 schema missing profile columns)', err);
      return c.json(
        {
          error:
            'Database is missing profile columns. From backend/, run: npx wrangler d1 migrations apply horoscope-db --local. If that fails on 0004 (duplicate stripe columns), see backend/README.md.',
        },
        503,
      );
    }
    console.error('avatar upload failed', err);
    return c.json({ error: 'Failed to upload avatar' }, 500);
  }
});

export default router;
