import type { MiddlewareHandler } from 'hono';
import type { AppBindings, AppVariables } from '../types';

type RateLimitOptions = {
  keyPrefix: string;
  limit: number;
  windowMs: number;
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitBucket>();

function firstForwardedIp(value: string): string {
  return value.split(',')[0]?.trim() ?? '';
}

export function getClientIp(headers: Pick<Headers, 'get'>): string {
  const cfIp = headers.get('CF-Connecting-IP')?.trim();
  if (cfIp) return cfIp;

  const forwardedFor = headers.get('X-Forwarded-For')?.trim();
  if (forwardedFor) {
    const first = firstForwardedIp(forwardedFor);
    if (first) return first;
  }

  const realIp = headers.get('X-Real-IP')?.trim();
  if (realIp) return realIp;

  return 'unknown';
}

export function resetInMemoryRateLimits(): void {
  buckets.clear();
}

export function createRateLimitMiddleware(
  options: RateLimitOptions,
): MiddlewareHandler<{ Bindings: AppBindings; Variables: AppVariables }> {
  return async (c, next) => {
    const now = Date.now();
    const ip = getClientIp(c.req.raw.headers);
    const key = `${options.keyPrefix}:${ip}`;
    const existing = buckets.get(key);
    const bucket =
      existing && existing.resetAt > now
        ? existing
        : {
            count: 0,
            resetAt: now + options.windowMs,
          };

    bucket.count += 1;
    buckets.set(key, bucket);

    if (bucket.count > options.limit) {
      const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      c.header('Retry-After', String(retryAfter));
      return c.json({ error: 'Too many requests, please try again later' }, 429);
    }

    await next();
  };
}
