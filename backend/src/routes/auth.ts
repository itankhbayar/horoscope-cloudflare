import { Hono } from 'hono';
import { getDb } from '../db/client';
import {
  ACCESS_TOKEN_TTL_SECONDS,
  HttpError,
  getUserById,
  loginUser,
  registerUser,
} from '../services/authService';
import { authMiddleware, requireUserId } from '../middleware/auth';
import { createRateLimitMiddleware, getClientIp } from '../middleware/rateLimit';
import {
  checkBreachedPassword,
  breachedPasswordOptionsFromEnv,
} from '../services/breachedPasswordService';
import type { AppBindings, AppVariables } from '../types';
import { loginSchema, refreshTokenBodySchema, registerSchema } from '../schemas/auth';
import { parseJsonBody, parseOptionalJsonBody, isResponse } from '../validators/request';
import { fail, ok } from '../utils/apiResponse';
import { captureException } from '../utils/sentry';
import { logFromContext, metric } from '../utils/logger';
import {
  RefreshSessionError,
  createRefreshSessionForAuthResult,
  incrementUserTokenVersion,
  revokeAllUserRefreshSessions,
  revokeCurrentRefreshSession,
  rotateRefreshSession,
} from '../services/refreshSessionService';
import {
  clearRefreshTokenCookie,
  getRefreshTokenCookie,
  setRefreshTokenCookie,
} from '../utils/refreshCookie';

const router = new Hono<{ Bindings: AppBindings; Variables: AppVariables }>();

const loginRateLimit = createRateLimitMiddleware({
  keyPrefix: 'auth:login',
  limit: 5,
  windowMs: 60_000,
  binding: 'LOGIN_RATE_LIMITER',
});

const registerRateLimit = createRateLimitMiddleware({
  keyPrefix: 'auth:register',
  limit: 3,
  windowMs: 60_000,
  binding: 'REGISTER_RATE_LIMITER',
});

const refreshRateLimit = createRateLimitMiddleware({
  keyPrefix: 'auth:refresh',
  limit: 20,
  windowMs: 60_000,
  binding: 'REFRESH_RATE_LIMITER',
});

const REGISTER_ERROR = 'Registration failed';

function isV1(c: { req: { path: string } }): boolean {
  return c.req.path.startsWith('/api/v1/');
}

function sessionContext(c: { req: { header: (name: string) => string | undefined; raw: Request } }) {
  return {
    userAgent: c.req.header('user-agent') ?? null,
    ipAddress: getClientIp(c.req.raw.headers),
  };
}

function secureAuthData(session: {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; fullName: string; isPremium: boolean };
}) {
  return {
    token: session.accessToken,
    accessToken: session.accessToken,
    accessTokenExpiresIn: ACCESS_TOKEN_TTL_SECONDS,
    refreshToken: session.refreshToken,
    refreshTokenExpiresIn: 60 * 60 * 24 * 7,
    user: session.user,
  };
}

function refreshErrorResponse(c: Parameters<typeof fail>[0], err: unknown): Response {
  if (err instanceof RefreshSessionError) {
    const status = err.code === 'missing' ? 400 : 401;
    return fail(c, status, 'UNAUTHORIZED', err.message);
  }
  return fail(c, 500, 'INTERNAL_ERROR', 'Refresh failed');
}

router.post('/register', registerRateLimit, async (c) => {
  try {
    const body = await parseJsonBody(c, registerSchema);
    if (isResponse(body)) return body;

    const breachedPasswordCheck = await checkBreachedPassword(
      body.password,
      breachedPasswordOptionsFromEnv(c.env),
    );
    if (breachedPasswordCheck.status === 'breached' || breachedPasswordCheck.status === 'unavailable') {
      return fail(c, 400, 'BAD_REQUEST', 'Password does not meet security requirements');
    }

    const db = getDb(c.env.horoscope_db);
    const result = await registerUser(db, c.env.JWT_SECRET, body, {
      accessTokenTtlSeconds: isV1(c) ? ACCESS_TOKEN_TTL_SECONDS : undefined,
    });
    metric(c.env, 'signup_completed');
    if (isV1(c)) {
      const session = await createRefreshSessionForAuthResult(
        db,
        c.env.JWT_SECRET,
        result.user.id,
        sessionContext(c),
      );
      setRefreshTokenCookie(c, session.refreshToken);
      return ok(c, secureAuthData(session));
    }
    return ok(c, result);
  } catch (err) {
    if (err instanceof HttpError) {
      metric(c.env, 'auth_failure', { route: 'register', status: err.status });
      if (err.status === 409) return fail(c, 400, 'BAD_REQUEST', REGISTER_ERROR);
      return fail(c, err.status, err.status === 409 ? 'CONFLICT' : 'BAD_REQUEST', err.message);
    }
    logFromContext(c, 'error', 'register_failed', { error: err });
    captureException(err, { route: { path: '/api/auth/register' } });
    return fail(c, 500, 'INTERNAL_ERROR', REGISTER_ERROR);
  }
});

router.post('/login', loginRateLimit, async (c) => {
  try {
    const body = await parseJsonBody(c, loginSchema);
    if (isResponse(body)) return body;
    const db = getDb(c.env.horoscope_db);
    const result = await loginUser(db, c.env.JWT_SECRET, body, {
      accessTokenTtlSeconds: isV1(c) ? ACCESS_TOKEN_TTL_SECONDS : undefined,
    });
    metric(c.env, 'login_completed');
    if (isV1(c)) {
      const session = await createRefreshSessionForAuthResult(
        db,
        c.env.JWT_SECRET,
        result.user.id,
        sessionContext(c),
      );
      setRefreshTokenCookie(c, session.refreshToken);
      return ok(c, secureAuthData(session));
    }
    return ok(c, result);
  } catch (err) {
    if (err instanceof HttpError) {
      metric(c.env, 'auth_failure', { route: 'login', status: err.status });
      return fail(c, err.status, err.status === 401 ? 'UNAUTHORIZED' : 'BAD_REQUEST', err.message);
    }
    logFromContext(c, 'error', 'login_failed', { error: err });
    captureException(err, { route: { path: '/api/auth/login' } });
    return fail(c, 500, 'INTERNAL_ERROR', 'Login failed');
  }
});

router.post('/refresh', refreshRateLimit, async (c) => {
  if (!isV1(c)) return fail(c, 404, 'NOT_FOUND', 'Not found');
  const body = await parseOptionalJsonBody(c, refreshTokenBodySchema);
  if (isResponse(body)) return body;
  const refreshToken = body.refreshToken ?? getRefreshTokenCookie(c) ?? '';
  try {
    const db = getDb(c.env.horoscope_db);
    const session = await rotateRefreshSession(db, c.env.JWT_SECRET, refreshToken, sessionContext(c));
    setRefreshTokenCookie(c, session.refreshToken);
    logFromContext(c, 'info', 'auth_refresh_rotated', {
      userId: session.user.id,
      sessionId: session.refreshSession.id,
    });
    return ok(c, secureAuthData(session));
  } catch (err) {
    clearRefreshTokenCookie(c);
    logFromContext(c, 'warn', 'auth_refresh_failed', {
      reason: err instanceof RefreshSessionError ? err.code : err instanceof Error ? err.message : String(err),
    });
    return refreshErrorResponse(c, err);
  }
});

router.post('/logout', async (c) => {
  if (isV1(c)) {
    const body = await parseOptionalJsonBody(c, refreshTokenBodySchema);
    if (isResponse(body)) return body;
    const refreshToken = body.refreshToken ?? getRefreshTokenCookie(c);
    if (refreshToken) {
      const db = getDb(c.env.horoscope_db);
      await revokeCurrentRefreshSession(db, refreshToken);
      logFromContext(c, 'info', 'auth_logout_current_session');
    }
    clearRefreshTokenCookie(c);
  }
  return ok(c, { ok: true });
});

router.post('/logout-all', authMiddleware, async (c) => {
  if (!isV1(c)) return fail(c, 404, 'NOT_FOUND', 'Not found');
  const db = getDb(c.env.horoscope_db);
  const userId = requireUserId(c);
  await incrementUserTokenVersion(db, userId);
  await revokeAllUserRefreshSessions(db, userId);
  clearRefreshTokenCookie(c);
  logFromContext(c, 'warn', 'auth_logout_all_devices', { userId });
  return ok(c, { ok: true });
});

router.get('/me', authMiddleware, async (c) => {
  const db = getDb(c.env.horoscope_db);
  const userId = requireUserId(c);
  const user = await getUserById(db, userId);
  if (!user) return fail(c, 404, 'NOT_FOUND', 'User not found');
  return ok(c, {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    createdAt: user.createdAt,
    isPremium: Boolean(user.isPremium),
  });
});

export default router;
