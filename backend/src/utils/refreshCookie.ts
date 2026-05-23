import type { Context } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import type { AppBindings, AppVariables } from '../types';
import { REFRESH_TOKEN_TTL_SECONDS } from '../services/refreshSessionService';

const REFRESH_COOKIE_NAME = 'astralis_refresh';
const REFRESH_COOKIE_PATH = '/api/v1/auth';

type AppContext = Context<{ Bindings: AppBindings; Variables: AppVariables }>;

export function getRefreshTokenCookie(c: AppContext): string | undefined {
  return getCookie(c, REFRESH_COOKIE_NAME);
}

export function setRefreshTokenCookie(c: AppContext, token: string): void {
  setCookie(c, REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    path: REFRESH_COOKIE_PATH,
    maxAge: REFRESH_TOKEN_TTL_SECONDS,
  });
}

export function clearRefreshTokenCookie(c: AppContext): void {
  deleteCookie(c, REFRESH_COOKIE_NAME, {
    path: REFRESH_COOKIE_PATH,
    secure: true,
    sameSite: 'Lax',
  });
}
