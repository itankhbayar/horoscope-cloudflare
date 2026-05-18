import type { AppBindings } from './types';

/** Browser origins allowed for CORS (production Pages + local Vite). */
export const ALLOWED_CORS_ORIGINS = [
  'https://horoscope-frontend.pages.dev',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
] as const;

/** Pages preview deployments use *.horoscope-frontend.pages.dev */
export function isAllowedCorsOrigin(origin: string): boolean {
  if ((ALLOWED_CORS_ORIGINS as readonly string[]).includes(origin)) return true;
  try {
    const host = new URL(origin).hostname;
    return host === 'horoscope-frontend.pages.dev' || host.endsWith('.horoscope-frontend.pages.dev');
  } catch {
    return false;
  }
}

const DEFAULT_APP_PUBLIC_URL = 'http://localhost:5173';

/** Public web app base URL (no trailing slash) for Stripe redirects and returnUrl checks. */
export function resolveAppPublicUrl(env: Pick<AppBindings, 'APP_PUBLIC_URL'>): string {
  const raw = env.APP_PUBLIC_URL?.trim();
  if (raw && raw.length > 0) return raw.replace(/\/$/, '');
  return DEFAULT_APP_PUBLIC_URL;
}

export function premiumCheckoutUrls(appPublicUrl: string): { successUrl: string; cancelUrl: string } {
  const base = appPublicUrl.replace(/\/$/, '');
  return {
    successUrl: `${base}/premium/success`,
    cancelUrl: `${base}/premium/cancel`,
  };
}

export function isAllowedReturnUrl(url: string, env: Pick<AppBindings, 'APP_PUBLIC_URL'>): boolean {
  try {
    const u = new URL(url);
    if (u.protocol === 'astralis:') return true;
    if (u.protocol === 'http:' && (u.hostname === 'localhost' || u.hostname === '127.0.0.1')) {
      return true;
    }
    if (u.protocol === 'https:') {
      const appOrigin = new URL(resolveAppPublicUrl(env)).origin;
      if (u.origin === appOrigin) return true;
      return ALLOWED_CORS_ORIGINS.includes(u.origin as (typeof ALLOWED_CORS_ORIGINS)[number]);
    }
    return false;
  } catch {
    return false;
  }
}
